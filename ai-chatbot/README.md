# AI Chatbot — OpenAI GPT-4o

A full-stack AI chatbot with streaming responses, conversation history,
and Markdown rendering. Built with React, Node.js, Express, and OpenAI.

## Project Structure

```
ai-chatbot/
├── backend/
│   ├── server.js        ← Express server + OpenAI integration
│   ├── package.json
│   └── .env             ← your API key goes here (never commit!)
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── App.js       ← main React component
    │   ├── App.css      ← all styles
    │   └── index.js     ← React entry point
    └── package.json
```

## Quick Start

### 1. Get your OpenAI API key
Sign up at https://platform.openai.com — create an API key in the dashboard.

### 2. Set up the backend

```bash
cd backend
cp .env.example .env
# open .env and add your OPENAI_API_KEY
npm install
npm run dev        # starts on http://localhost:5000
```

### 3. Set up the frontend (new terminal)

```bash
cd frontend
npm install
npm start          # starts on http://localhost:3000
```

## Features
- Real-time streaming responses (text appears word by word)
- Conversation history (remembers context in the session)
- Markdown rendering (code blocks, bold, lists etc.)
- Typing indicator while AI is thinking
- Suggestion prompts on the welcome screen
- Clear chat button
- Error handling

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/chat | Send a message, get streaming response |
| DELETE | /api/chat/:id | Clear conversation history |
| GET | /api/health | Health check |

## Deployment

### Backend → Railway
1. Push code to GitHub
2. Go to railway.app → New Project → Deploy from GitHub
3. Add environment variable: OPENAI_API_KEY
4. Also add: FRONTEND_URL=https://your-app.vercel.app

### Frontend → Vercel
1. Go to vercel.com → New Project → Import your GitHub repo
2. Set root directory to `frontend`
3. Add environment variable: REACT_APP_BACKEND_URL=https://your-backend.railway.app
4. Deploy

## Ideas to extend this project
- Add user authentication (JWT)
- Save conversations to MongoDB
- Add multiple bot personas (customer support, coding tutor, etc.)
- Add image upload support (GPT-4o Vision)
- Add voice input/output
