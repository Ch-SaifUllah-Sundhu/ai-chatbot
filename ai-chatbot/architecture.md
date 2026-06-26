# Nexus AI Architecture & Backend Guide

This guide breaks down exactly how your new High-Level AI Chatbot (Nexus AI) works behind the scenes. 

## 1. Complete Backend Structure

Your backend is built with **Node.js** and **Express.js**. Here is how the files are organized and what they do:

```text
backend/
├── db.js                 # Sets up the SQLite database (Users & Conversations)
├── middleware/
│   └── auth.js           # Protects routes by verifying JWT tokens
├── routes/
│   └── auth.js           # Handles /register and /login logic
├── server.js             # The main entry point. Sets up Express, Multer, and the /api/chat route
├── chatbot.db            # (Generated automatically) Your local SQLite database file
├── .env                  # Your secret API keys (Gemini, JWT Secret, etc.)
└── package.json          # Lists installed packages (express, sqlite3, jsonwebtoken, etc.)
```

### Flow of Data:
When the backend starts (`node server.js`), it connects to the database via `db.js`. It then registers your `authRoutes` and sets up the `/api/chat` route to listen for requests from your React frontend.

---

## 2. Authentication & JWT (JSON Web Tokens)

**How it works:**
HTTP is "stateless"—meaning the server forgets who you are the second a request finishes. To keep users logged in, we use JWT.

1. **Login/Register (`routes/auth.js`)**: When a user logs in, the backend checks the SQLite database. If the password matches, the backend creates a secret **JWT (JSON Web Token)**. This token contains the user's `id` and `username`.
2. **The Signature**: The backend signs this token using a secret key (`JWT_SECRET` in `.env`). This ensures nobody can tamper with the token.
3. **Storage**: The backend sends this token to the frontend, and the frontend saves it in the browser's `localStorage`.
4. **Subsequent Requests**: Every time the frontend wants to chat, it attaches this token to the request headers: `Authorization: Bearer <token>`.

---

## 3. How Middleware Works

Middleware in Express consists of functions that intercept requests *before* they reach your main route handler.

In your app, `middleware/auth.js` acts as a security guard for the `/api/chat` route.

```javascript
// From server.js
app.post("/api/chat", verifyToken, upload.single("image"), async (req, res) => { ... })
```

Here is the exact order of operations when a user sends a chat message:
1. **Request arrives** at `/api/chat`.
2. **`verifyToken` runs (Middleware 1)**: It grabs the token from the request headers. It uses `jwt.verify()` to check if the token is valid and hasn't been tampered with.
   - *If invalid/missing*: It rejects the request immediately with a `401 Unauthorized` error.
   - *If valid*: It attaches the decoded user data to `req.user` and calls `next()`, allowing the request to proceed.
3. **`upload.single("image")` runs (Middleware 2)**: This is from `multer`. It checks if the user attached a file. If so, it processes the image and attaches it to `req.file`. It then calls `next()`.
4. **Your main route function runs**: Now that the user is authenticated and the image is processed, your main code runs to talk to Gemini and save the chat to the database.

---

## 4. How to Handle Routes

Routes are simply URL endpoints that tell your server what action to perform.

In `server.js`, instead of putting all our code in one giant file, we "mounted" the auth routes from another file:
```javascript
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes); // Any request to /api/auth goes to authRoutes
```

Inside `routes/auth.js`, we define specific paths using `express.Router()`:
*   `router.post('/register', ...)` becomes **`POST /api/auth/register`**
*   `router.post('/login', ...)` becomes **`POST /api/auth/login`**

This modular approach keeps your code clean and easy to scale. If you wanted to add a billing system later, you would just create `routes/billing.js` and mount it to `/api/billing`.

---

## 5. Communication Between Frontend & Backend

Your React frontend (running on port 3000) and your Node backend (running on port 5000) are separate applications. Here's how they talk:

### A. CORS (Cross-Origin Resource Sharing)
By default, browsers block frontend apps from talking to backends on different ports for security. In `server.js`, we use the `cors` package:
```javascript
app.use(cors({ origin: "*" })); 
```
This tells the browser: *"It's okay, allow the React app to send requests here."*

### B. Standard Requests (JSON)
For Login/Register, the frontend uses `fetch()` to send standard JSON data (username/password). The backend responds with JSON containing the JWT token.

### C. Multipart Form-Data (Images)
For `/api/chat`, because we allow image uploads, standard JSON isn't enough. The frontend uses a `FormData` object to combine text strings (the message, persona) and binary files (the image) into a single request. 

### D. Server-Sent Events (SSE) for Streaming
Normal HTTP requests are "one-and-done". You send a request, wait 5 seconds, and get the full response. 
Because AI generation takes time, waiting is a bad user experience. Instead, we use **SSE (Server-Sent Events)**:
1. The frontend initiates the request.
2. The backend responds immediately with `Content-Type: text/event-stream` and `Connection: keep-alive`. This keeps the connection open.
3. As Gemini generates the response word-by-word, the backend uses `res.write()` to stream chunks of text back to the frontend in real-time.
4. The frontend's `while (true)` loop in `App.js` reads these incoming chunks on the fly and updates the UI instantly, creating that cool "typing" effect!
