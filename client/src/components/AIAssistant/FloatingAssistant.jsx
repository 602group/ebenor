import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { MessageSquare, X, Send, Bot, Sparkles } from 'lucide-react';
import './FloatingAssistant.css';

const FloatingAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'system', content: 'Hello! I am your AI platform operator. How can I assist you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const location = useLocation();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (text = input) => {
    if (!text.trim()) return;

    const userMsg = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post('/api/ai/chat', {
        messages: updatedMessages.filter(m => m.role !== 'system' || m.content.startsWith('Hello!')),
        context: {
          path: location.pathname,
          search: location.search
        }
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data && response.data.message) {
        setMessages(prev => [...prev, response.data.message]);
      } else {
        throw new Error('Invalid response');
      }
    } catch (error) {
      console.error('AI Chat Error:', error);
      setMessages(prev => [...prev, { 
        role: 'system', 
        content: error.response?.data?.error || 'Oops! I encountered an error connecting to my core processor. Make sure the API key is set in the server.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    "Show my open trades",
    "Summarize my portfolio",
    "What real estate deals am I working on?",
    "Show latest notes"
  ];

  return (
    <div className="ai-fab-container">
      {isOpen && (
        <div className="ai-chat-window">
          <div className="ai-chat-header">
            <div className="ai-chat-header-title">
              <Bot size={20} /> Platform Operator
            </div>
            <button className="ai-chat-close" onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
          </div>
          
          <div className="ai-chat-body">
            {messages.map((msg, idx) => (
              <div key={idx} className={`ai-message ${msg.role === 'user' ? 'user' : 'system'}`}>
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="ai-message system">
                <div className="loader-dots">
                  <div className="loader-dot"></div>
                  <div className="loader-dot"></div>
                  <div className="loader-dot"></div>
                </div>
              </div>
            )}
            
            {messages.length === 1 && (
              <div className="ai-suggestions">
                {suggestions.map((suggestion, i) => (
                  <button 
                    key={i} 
                    className="ai-suggestion-chip"
                    onClick={() => handleSend(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="ai-chat-footer">
            <div className="ai-chat-input-wrapper">
              <input
                type="text"
                className="ai-chat-input"
                placeholder="Ask your assistant..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
              <button 
                className="ai-send-btn" 
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {!isOpen && (
        <button className="ai-fab-button" onClick={() => setIsOpen(true)}>
          <Sparkles size={28} />
        </button>
      )}
    </div>
  );
};

export default FloatingAssistant;
