import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, Phone, X, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import elevenLabsAgent from '../services/elevenLabsAgent';

const VoiceAssistant: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{
    type: 'user' | 'assistant';
    text: string;
    timestamp: Date;
  }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set up callbacks for ElevenLabs agent
    elevenLabsAgent.setCallbacks({
      onTranscriptUpdate: (text, role) => {
        setConversationHistory(prev => [...prev, {
          type: role === 'user' ? 'user' : 'assistant',
          text,
          timestamp: new Date()
        }]);
      },
      onStatusChange: (status) => {
        setConnectionStatus(status);
        if (status === 'Ready') {
          setIsConnected(true);
          setIsConnecting(false);
        } else if (status === 'Disconnected') {
          setIsConnected(false);
          setIsConnecting(false);
          setIsListening(false);
        } else if (status === 'Listening') {
          setIsListening(true);
        } else if (status === 'Processing') {
          setIsListening(false);
        }
      },
      onError: (errorMsg) => {
        setError(errorMsg);
        setTimeout(() => setError(null), 5000);
      }
    });

    // Add welcome message
    setConversationHistory([{
      type: 'assistant',
      text: 'Hello! I\'m your AI-powered financial assistant. I can help you with your portfolio, stock prices, and positions.',
      timestamp: new Date()
    }]);

    // Cleanup on unmount
    return () => {
      if (elevenLabsAgent.isConnected()) {
        elevenLabsAgent.disconnect();
      }
    };
  }, []);

  const connectAgent = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      await elevenLabsAgent.connect();
    } catch (error) {
      console.error('Failed to connect to agent:', error);
      setError('Failed to connect. Please try again.');
      setIsConnecting(false);
    }
  };

  const disconnectAgent = () => {
    elevenLabsAgent.disconnect();
    setIsConnected(false);
    setIsListening(false);
  };

  const startListening = async () => {
    if (!isConnected) {
      setError('Please connect to the agent first');
      return;
    }

    try {
      await elevenLabsAgent.startListening();
      setIsListening(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to access microphone. Please check permissions.');
    }
  };

  const stopListening = () => {
    elevenLabsAgent.stopListening();
    setIsListening(false);
  };

  const toggleAssistant = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      setIsOpen(true);
      // Auto-connect when opening
      if (!isConnected && !isConnecting) {
        connectAgent();
      }
    } else {
      setIsOpen(!isOpen);
      // Auto-connect when reopening if not connected
      if (isOpen === false && !isConnected && !isConnecting) {
        connectAgent();
      }
      if (isListening) {
        stopListening();
      }
    }
  };

  const closeAll = () => {
    setIsOpen(false);
    setIsExpanded(false);
    if (isListening) {
      stopListening();
    }
    if (isConnected) {
      disconnectAgent();
    }
  };

  return (
    <>
      {/* Floating Voice Button */}
      {!isExpanded ? (
        <motion.div
          className="voice-widget"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={toggleAssistant}
        >
          <div className="voice-widget-icon">
            <div className="voice-widget-icon-inner"></div>
          </div>
          <span className="voice-widget-text">Need help?</span>
          <div className="voice-widget-button">
            <Phone size={18} />
            <span>Ask anything</span>
          </div>
        </motion.div>
      ) : null}

      {/* Voice Assistant Panel */}
      <AnimatePresence>
        {isOpen && isExpanded && (
          <motion.div
            className="voice-assistant"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 20 }}
          >
            <div className="voice-header">
              <h3>AI Financial Assistant</h3>
              <div className="voice-header-actions">
                <div className="connection-status">
                  {isConnected ? (
                    <Wifi size={16} className="status-icon connected" />
                  ) : (
                    <WifiOff size={16} className="status-icon disconnected" />
                  )}
                  <span className="voice-status">
                    {connectionStatus}
                  </span>
                </div>
                <button className="voice-close" onClick={closeAll}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="conversation-container">
              {conversationHistory.map((entry, index) => (
                <div key={index} className={`message ${entry.type}`}>
                  <div className="message-content">
                    {entry.type === 'user' ? (
                      <Mic size={16} className="message-icon" />
                    ) : (
                      <Volume2 size={16} className="message-icon" />
                    )}
                    <p>{entry.text}</p>
                  </div>
                  <span className="message-time">
                    {entry.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              ))}
            </div>

            <div className="voice-controls">
              {isConnecting ? (
                <div className="connecting-status">
                  <div className="spinner"></div>
                  <span>Connecting to AI assistant...</span>
                </div>
              ) : isConnected ? (
                <>
                  <motion.button
                    className={`voice-button ${isListening ? 'active' : ''}`}
                    onClick={isListening ? stopListening : startListening}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isListening ? (
                      <>
                        <MicOff size={20} />
                        <span>Stop</span>
                      </>
                    ) : (
                      <>
                        <Mic size={20} />
                        <span>Start Speaking</span>
                      </>
                    )}
                  </motion.button>

                  {isListening && (
                    <motion.div
                      className="voice-wave"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <span className="wave"></span>
                      <span className="wave"></span>
                      <span className="wave"></span>
                    </motion.div>
                  )}
                </>
              ) : (
                <div className="connecting-status">
                  <div className="spinner"></div>
                  <span>Reconnecting...</span>
                </div>
              )}
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="voice-hints">
              <p>Natural conversation examples:</p>
              <ul>
                <li>"Tell me about my portfolio"</li>
                <li>"What's the current price of Apple?"</li>
                <li>"Which stocks are performing best today?"</li>
                <li>"How many shares of Tesla do I own?"</li>
                <li>"Give me a summary of my investments"</li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VoiceAssistant;
