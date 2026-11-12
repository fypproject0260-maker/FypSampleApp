const express = require("express");
const app = express();

// Lets the server read what the forms send
app.use(express.urlencoded({ extended: false }));

// Saved accounts (kept in memory, they reset when the server restarts)
var users = {};

// Who is logged in right now (null means nobody)
var currentUser = null;

// Show the login page (or the welcome page if already logged in)
app.get("/", function (req, res) {
  if (currentUser) {
    res.redirect("/home");
  } else {
    res.sendFile(__dirname + "/login.html");
  }
});

// Show the sign up page (or the welcome page if already logged in)
app.get("/signup", function (req, res) {
  if (currentUser) {
    res.redirect("/home");
  } else {
    res.sendFile(__dirname + "/signup.html");
  }
});

// Show the welcome page (or the login page if not logged in)
app.get("/home", function (req, res) {
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
app.post("/signup", function (req, res) {
  var username = req.body.username;
  var password = req.body.password;

  if (users[username]) {
    res.send("Username already taken. <a href='/signup'>Go back</a>");
  } else {
    users[username] = password;
    currentUser = username;
    res.redirect("/home");
  }
});

// Log in (receives the form from login.html)
app.post("/login", function (req, res) {
  var username = req.body.username;
  var password = req.body.password;

  if (users[username] === password) {
    currentUser = username;
    res.redirect("/home");
  } else {
    res.send("Wrong username or password. <a href='/'>Go back</a>");
  }
});

// Log out
app.post("/logout", function (req, res) {
  currentUser = null;
  res.redirect("/");
});

// Start the server
app.listen(6767, function () {
  console.log("Server running at http://localhost:6767");
});