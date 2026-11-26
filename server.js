const express = require("express");
const cookieSession = require("cookie-session");
const crypto = require("crypto");
const { Pool } = require("pg");

const PORT = 6767;

// ---------- Configuration (from environment variables) ----------
// In Kubernetes these come from the Secrets "postgres-secret" and "app-session-secret".
// In the CI test stage they point at a throwaway Postgres container.
if (!process.env.SESSION_SECRET) {
  console.error("SESSION_SECRET is not set - refusing to start");
  process.exit(1);
}

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 5,                        // per replica; 2 replicas = 10 of Postgres's 30 connections
  connectionTimeoutMillis: 5000,
});

// An idle connection dropping (e.g. Postgres restarting) must not crash the app
pool.on("error", function (err) {
  console.error("Postgres pool error:", err.message);
});

const app = express();

// Lets the server read what the forms send
app.use(express.urlencoded({ extended: false }));

// Each browser gets its own signed session cookie, so logins are per visitor
// and work no matter which replica handles the request.
app.use(
  cookieSession({
    name: "fyp_session",
    keys: [process.env.SESSION_SECRET],
    maxAge: 60 * 60 * 1000,      // 1 hour
    httpOnly: true,
    sameSite: "lax",
  })
);

function hashPassword(password) {
  return crypto.createHash("md5").update(password).digest("hex");
}

function loggedInUser(req) {
  return req.session && req.session.username ? req.session.username : null;
}

// Show the login page (or the welcome page if already logged in)
app.get("/", function (req, res) {
  if (loggedInUser(req)) {
    res.redirect("/home");
  } else {
    res.sendFile(__dirname + "/login.html");
  }
});

// Show the sign up page (or the welcome page if already logged in)
app.get("/signup", function (req, res) {
  if (loggedInUser(req)) {
    res.redirect("/home");
  } else {
    res.sendFile(__dirname + "/signup.html");
  }
});

// Show the welcome page (or the login page if not logged in)
app.get("/home", function (req, res) {
  var currentUser = loggedInUser(req);
  if (!currentUser) {
    res.redirect("/");
  } else {
    res.send(`
      <html>
      <head>
        <title>Welcome</title>
        <style>
          body { font-family: Arial; background: #eeeeee; text-align: center; padding-top: 80px; }
          .box { background: white; width: 280px; margin: auto; padding: 30px; border-radius: 8px; }
          button { width: 100%; padding: 10px; background: blue; color: white; border: none; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="box">
          <h2>Welcome, ${currentUser}!</h2>
          <p>You are logged in.</p>
          <form method="post" action="/logout">
            <button type="submit">Log out</button>
          </form>
        </div>
      </body>
      </html>
    `);
  }
});

// Sign up (receives the form from signup.html)
app.post("/signup", async function (req, res) {
  var username = (req.body.username || "").trim();
  var password = req.body.password || "";

  if (!username || !password || username.length > 50) {
    return res.status(400).send("Username (max 50 characters) and password are required. <a href='/signup'>Go back</a>");
  }

  var passwordHash = hashPassword(password);
  try {
    // $1/$2 placeholders: values are sent separately from the SQL (no SQL injection)
    await pool.query("INSERT INTO users (username, password_hash) VALUES ($1, $2)", [username, passwordHash]);
  } catch (err) {
    if (err.code === "23505") {   // unique_violation: username already exists
      return res.send("Username already taken. <a href='/signup'>Go back</a>");
    }
    throw err;                    // anything else -> Express returns a 500
  }

  req.session.username = username;
  res.redirect("/home");
});

// Log in (receives the form from login.html)
app.post("/login", async function (req, res) {
  var username = (req.body.username || "").trim();
  var password = req.body.password || "";

  var result = await pool.query("SELECT password_hash FROM users WHERE username = $1", [username]);
  var ok = result.rows.length === 1 && result.rows[0].password_hash === hashPassword(password);

  if (ok) {
    req.session.username = username;
    res.redirect("/home");
  } else {
    res.send("Wrong username or password. <a href='/'>Go back</a>");
  }
});

// Log out
app.post("/logout", function (req, res) {
  req.session = null;
  res.redirect("/");
});

// Health check: 200 if the app can reach Postgres, 503 if not
app.get("/healthz", async function (req, res) {
  try {
    await pool.query("SELECT 1");
    res.send("ok");
  } catch (err) {
    res.status(503).send("database unavailable");
  }
});

// ---------- Startup ----------
// Wait for Postgres (it may still be starting), make sure the table exists, then listen.
async function start() {
  for (var attempt = 1; attempt <= 30; attempt++) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id            SERIAL PRIMARY KEY,
          username      VARCHAR(50)  UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
      `);
      break;
    } catch (err) {
      if (attempt === 30) {
        console.error("Could not reach Postgres after 30 attempts:", err.message);
        process.exit(1);
      }
      console.log("Waiting for Postgres (attempt " + attempt + "): " + err.message);
      await new Promise(function (r) { setTimeout(r, 2000); });
    }
  }

  var server = app.listen(PORT, function () {
    console.log("Server running at http://localhost:" + PORT);
  });

  // Graceful shutdown on rolling updates: finish in-flight requests, close DB connections
  process.on("SIGTERM", function () {
    console.log("SIGTERM received, shutting down");
    server.close(function () {
      pool.end().then(function () { process.exit(0); });
    });
  });
}

start();
