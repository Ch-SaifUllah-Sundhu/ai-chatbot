const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

// Vercel has a read-only filesystem except for the /tmp directory
const dbPath = process.env.VERCEL
  ? path.join(os.tmpdir(), 'chatbot.db')
  : path.resolve(__dirname, 'chatbot.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Create tables if they don't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      conversationId TEXT NOT NULL,
      history TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);
});

module.exports = db;
