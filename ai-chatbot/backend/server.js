require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require("./db");
const authRoutes = require("./routes/auth");
const verifyToken = require("./middleware/auth");

const app = express();

// Set up Multer for handling multipart/form-data (image uploads)
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
let genAI;
if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
}

const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, "http://localhost:3000"]
  : "*";

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

// Define Personas
const personas = {
  default: `You are a helpful AI assistant built with Google Gemini. You are friendly, clear, and concise.`,
  "Customer Support": `You are a professional, empathetic customer support agent. Help users resolve issues quickly and politely.`,
  "Coding Tutor": `You are an expert coding tutor. Explain programming concepts clearly, provide code snippets, and encourage best practices.`,
  "Creative Writer": `You are a creative writer and brainstormer. Provide vivid descriptions, engaging narratives, and out-of-the-box ideas.`
};

// ─── POST /api/chat ───────────────────────────────────────────────────────────
// Added verifyToken middleware to protect the route
app.post("/api/chat", verifyToken, upload.single("image"), async (req, res) => {
  let { message, conversationId = "default", persona = "default" } = req.body;
  
  // If the request contains a file, req.body might be parsed differently, 
  // but let's assume message is sent as text field in form-data
  if (!message && !req.file) {
    return res.status(400).json({ error: "Message or image is required" });
  }

  if (!apiKey) {
    return res.status(500).json({ error: "API Key is missing in backend .env" });
  }

  const userId = req.user.id;
  const system = personas[persona] || personas.default;

  try {
    // 1. Get history from DB
    db.get(`SELECT history FROM conversations WHERE userId = ? AND conversationId = ?`, [userId, conversationId], async (err, row) => {
      if (err) return res.status(500).json({ error: "Database error" });

      let history = row ? JSON.parse(row.history) : [];

      // Set up SSE
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: system,
      });

      // Format history for Gemini SDK
      const geminiHistory = history.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: msg.parts ? msg.parts : [{ text: msg.content }], // support multimodal parts in history
      }));

      const chat = model.startChat({ history: geminiHistory });

      // Build the message parts (text + optional image)
      const messageParts = [];
      if (message) messageParts.push({ text: message });
      
      if (req.file) {
        // Convert buffer to base64
        const base64Data = req.file.buffer.toString("base64");
        messageParts.push({
          inlineData: {
            data: base64Data,
            mimeType: req.file.mimetype
          }
        });
      }

      // Add to our local history store
      const userHistoryEntry = { role: "user", content: message || "[Image uploaded]", parts: messageParts };
      history.push(userHistoryEntry);

      // Stream the response
      const result = await chat.sendMessageStream(messageParts);

      let fullResponse = "";

      for await (const chunk of result.stream) {
        const content = chunk.text();
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // Save AI reply to history
      history.push({ role: "assistant", content: fullResponse, parts: [{ text: fullResponse }] });

      // Keep history to last 20 messages
      if (history.length > 20) history = history.slice(-20);

      // Save history back to DB
      const historyStr = JSON.stringify(history);
      if (row) {
        db.run(`UPDATE conversations SET history = ? WHERE userId = ? AND conversationId = ?`, [historyStr, userId, conversationId]);
      } else {
        db.run(`INSERT INTO conversations (userId, conversationId, history) VALUES (?, ?, ?)`, [userId, conversationId, historyStr]);
      }

      res.write("data: [DONE]\n\n");
      res.end();
    });
  } catch (error) {
    console.error("Gemini error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to get response from Gemini" });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

// ─── DELETE /api/chat/:conversationId ────────────────────────────────────────
app.delete("/api/chat/:conversationId", verifyToken, (req, res) => {
  const userId = req.user.id;
  db.run(`DELETE FROM conversations WHERE userId = ? AND conversationId = ?`, [userId, req.params.conversationId], (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ success: true, message: "Conversation cleared" });
  });
});

// ─── GET /api/health ─────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", model: "gemini-2.5-flash" });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

// Export the Express API for Vercel
module.exports = app;
