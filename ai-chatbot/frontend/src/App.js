import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { v4 as uuidv4 } from "uuid";
import Auth from "./components/Auth";
import Sidebar from "./components/Sidebar";
import ChatInput from "./components/ChatInput";
import { Volume2 } from "lucide-react";
import "./App.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
const CONVERSATION_ID = uuidv4(); 

function App() {
  const [token, setToken] = useState(localStorage.getItem('chat_token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('chat_user')));
  const [persona, setPersona] = useState('default');
  
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleLogout = () => {
    localStorage.removeItem('chat_token');
    localStorage.removeItem('chat_user');
    setToken(null);
    setUser(null);
    setMessages([]);
  };

  const playTTS = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // stop previous
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  const sendMessage = useCallback(
    async (text, imageFile = null) => {
      if ((!text && !imageFile) || isLoading) return;

      setIsLoading(true);

      const userMsgId = uuidv4();
      const userMsg = { 
        id: userMsgId, 
        role: "user", 
        content: text || "[Image uploaded]",
        imageUrl: imageFile ? URL.createObjectURL(imageFile) : null
      };
      
      setMessages((prev) => [...prev, userMsg]);

      const assistantId = uuidv4();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      try {
        const formData = new FormData();
        formData.append("message", text);
        formData.append("conversationId", CONVERSATION_ID);
        formData.append("persona", persona);
        if (imageFile) {
          formData.append("image", imageFile);
        }

        const res = await fetch(`${BACKEND_URL}/api/chat`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          },
          body: formData,
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            handleLogout();
            throw new Error("Session expired");
          }
          throw new Error(`Server error: ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finalOutput = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop(); 

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") {
              // Optionally play voice if configured automatically, or let user click
              break;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                finalOutput += parsed.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + parsed.content }
                      : m
                  )
                );
              }
              if (parsed.error) throw new Error(parsed.error);
            } catch (e) {
              if (e.message !== "Unexpected end of JSON input") throw e;
            }
          }
        }
      } catch (err) {
        console.error("Chat error:", err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Something went wrong. Please try again.", error: true }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, persona, token]
  );

  const clearChat = async () => {
    setMessages([]);
    await fetch(`${BACKEND_URL}/api/chat/${CONVERSATION_ID}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    }).catch(() => {});
  };

  if (!token) {
    return <Auth setToken={setToken} setUser={setUser} />;
  }

  return (
    <div className="app-container">
      <Sidebar 
        currentPersona={persona} 
        setPersona={setPersona} 
        handleLogout={handleLogout} 
        user={user}
      />
      
      <div className="chat-wrapper">
        <header className="chat-header">
          <div className="header-left">
            <div className="header-info">
              <h1>Nexus AI - {persona === 'default' ? 'Support' : persona}</h1>
              <span className="status">Online · Gemini 2.5 Flash</span>
            </div>
          </div>
          {messages.length > 0 && (
            <button className="clear-btn" onClick={clearChat}>
              Clear chat
            </button>
          )}
        </header>

        <main className="messages-area">
          {messages.length === 0 && (
            <div className="welcome-message">
              <h2>How can I help you today?</h2>
              <p>I am currently using the <strong>{persona === 'default' ? 'Customer Support' : persona}</strong> persona.</p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div className="msg-avatar">
                {msg.role === "user" ? "👤" : "🤖"}
              </div>
              <div className="message-content">
                <div className={`bubble ${msg.error ? "error-bubble" : ""}`}>
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="Uploaded" className="msg-image" />
                  )}
                  {msg.role === "assistant" ? (
                    msg.content === "" && !msg.error ? (
                      <div className="typing-indicator">
                        <span /><span /><span />
                      </div>
                    ) : (
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    )
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === 'assistant' && msg.content && !msg.error && (
                  <button className="tts-btn" onClick={() => playTTS(msg.content)} title="Read aloud">
                    <Volume2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </main>

        <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
}

export default App;
