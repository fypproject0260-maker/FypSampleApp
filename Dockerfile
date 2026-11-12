FROM node:20-alpine
WORKDIR /app

# Copy dependency files first so Docker can cache the install step
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the app
COPY . .

EXPOSE 6767
CMD ["node", "server.js"]
