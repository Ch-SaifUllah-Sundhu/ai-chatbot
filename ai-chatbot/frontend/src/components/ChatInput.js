import React, { useRef, useState, useEffect } from 'react';
import { Send, Image as ImageIcon, Mic, MicOff, X } from 'lucide-react';

function ChatInput({ onSendMessage, isLoading }) {
  const [input, setInput] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isListening, setIsListening] = useState(false);
  
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Setup Web Speech API for voice input
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        // Append final transcript or show interim
        if (finalTranscript) {
          setInput(prev => prev + ' ' + finalTranscript.trim());
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    const ta = textareaRef.current;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 150) + 'px';
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const submit = () => {
    if ((!input.trim() && !image) || isLoading) return;
    
    // Stop listening if sending
    if (isListening) recognitionRef.current?.stop();

    onSendMessage(input, image);
    
    setInput('');
    clearImage();
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <footer className="input-area">
      {imagePreview && (
        <div className="image-preview-container">
          <img src={imagePreview} alt="Preview" className="image-preview" />
          <button className="clear-image-btn" onClick={clearImage}>
            <X size={16} />
          </button>
        </div>
      )}
      <div className="input-row">
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleImageChange}
        />
        <button 
          className="icon-btn" 
          onClick={() => fileInputRef.current?.click()}
          title="Upload image"
          disabled={isLoading}
        >
          <ImageIcon size={20} />
        </button>
        
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? "Listening..." : "Message Nexus AI..."}
          rows={1}
          disabled={isLoading}
        />

        <button 
          className={`icon-btn ${isListening ? 'listening' : ''}`} 
          onClick={toggleListen}
          title={isListening ? "Stop listening" : "Voice input"}
          disabled={isLoading || !recognitionRef.current}
        >
          {isListening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button
          className="send-btn"
          onClick={submit}
          disabled={isLoading || (!input.trim() && !image)}
        >
          {isLoading ? "⏳" : <Send size={18} />}
        </button>
      </div>
    </footer>
  );
}

export default ChatInput;
