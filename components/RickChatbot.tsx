import React, { useState, useRef, useEffect } from 'react';
import { Send, Volume2, Trash2, MessageSquare, Mic, MicOff, Gamepad2 } from 'lucide-react';
import Rick3DViewer from './Rick3DViewer';
import RickTicTacToe from './RickTicTacToe';

const RickChatbot = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [pendingMessage, setPendingMessage] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeScreen, setActiveScreen] = useState(null);
  const audioRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  const chatHistoryRef = useRef(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current && showChatHistory) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, pendingMessage, showChatHistory]);

  // REPLACE the audio useEffect with this:
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      setIsPlayingAudio(true);
      audioRef.current.src = audioUrl;
      audioRef.current.load();
      audioRef.current.play().catch(err => {
        console.error('Playback error', err);
        setIsPlayingAudio(false);
      });
    }
  }, [audioUrl]);

  // Speech Recognition setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.interimResults = false;
        recognition.continuous = false;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputMessage(transcript);
          setIsListening(false);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    // Unlock audio on first interaction
    if (!audioUnlockedRef.current && audioRef.current) {
      audioRef.current.play().catch(() => {});
      audioRef.current.pause();
      audioUnlockedRef.current = true;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleAudioEnd = () => {
    setIsPlayingAudio(false);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    // ADD THIS - unlock audio on first interaction
    if (!audioUnlockedRef.current && audioRef.current) {
      audioRef.current.play().catch(() => {});
      audioRef.current.pause();
      audioUnlockedRef.current = true;
    }

    const userMessage = { role: 'user', content: inputMessage, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsThinking(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].slice(-10)
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      
      const rickMessage = { 
        role: 'assistant', 
        content: data.message, 
        timestamp: Date.now() 
      };

      setIsThinking(false);
      setMessages(prev => [...prev, rickMessage]);
      if (data.audioUrl) {
        setAudioUrl(data.audioUrl);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Aw jeez, something went wrong! Try again, *burp*', 
        timestamp: Date.now() 
      }]);
      setIsThinking(false);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setAudioUrl(null);
    setPendingMessage(null);
    setIsPlayingAudio(false);
    setIsThinking(false);
  };

  const replayAudio = () => {
    if (audioRef.current && audioUrl) {
      setIsPlayingAudio(true);
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
  };

  const toggleChatHistory = () => setShowChatHistory(prev => !prev);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#ffffff] to-black">
      <div className="max-w-6xl mx-auto p-4 flex flex-col h-screen">
        <div className="flex-1 bg-black bg-opacity-30 backdrop-blur-sm rounded-lg border border-[#ff5e00] shadow-2xl overflow-hidden mb-4">
          <Rick3DViewer 
            isPlayingAudio={isPlayingAudio}
            isThinking={isThinking}
            isLoading={isLoading}
            modelUrl="/models/ib.glb"
            backgroundImageUrl="https://res.cloudinary.com/dzq7c0mxt/image/upload/v1749164013/Rick_and_Morty_custom_portrait_background_green_portal_qpg1kq.jpg"
          />
        </div>

        <div className="bg-black bg-opacity-30 backdrop-blur-sm rounded-lg border border-[#ff5e00] shadow-2xl p-4">
          <div className="flex space-x-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask Ibrahim something..."
              className="flex-1 p-4 bg-black bg-opacity-50 border border-[#ff5e00] rounded-lg text-white placeholder-[#ffffff] focus:outline-none focus:border-[#ff5e00] focus:ring-1 focus:ring-[#ff5e00] text-lg"
              disabled={isLoading || isPlayingAudio || isThinking}
            />
            <button
              onClick={toggleListening}
              disabled={isLoading || isPlayingAudio || isThinking}
              className={`px-4 py-4 border border-[#ff5e00] text-white rounded-lg transition-colors duration-200 flex items-center justify-center ${
                isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-black hover:bg-gray-800'
              } disabled:bg-black disabled:opacity-50`}
            >
              {isListening ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            <button
              onClick={sendMessage}
              disabled={isLoading || isPlayingAudio || isThinking || !inputMessage.trim()}
              className="px-6 py-4 bg-[#ff5e00] hover:bg-[#ff7e30] disabled:bg-black disabled:opacity-50 text-white rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              <Send size={24} />
            </button>
          </div>

          {/* Status indicator - NO more "Tap to hear Rick" button */}
          <div className="text-center text-[#ff5e00] mt-2">
            {isListening && <p>Listening...</p>}
            {isThinking && <p>Ibrahim is thinking...</p>}
            {isPlayingAudio && <p>Ibrahim is talking...</p>}
          </div>

          <div className="flex flex-wrap gap-3 justify-center mt-4">
            <button
              onClick={clearChat}
              className="flex items-center space-x-2 px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors duration-200 border border-[#ff5e00]"
            >
              <Trash2 size={16} />
              <span>Clear Chat</span>
            </button>
            <button
              onClick={toggleChatHistory}
              className="flex items-center space-x-2 px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors duration-200 border border-[#ff5e00]"
            >
              <MessageSquare size={16} />
              <span>{showChatHistory ? 'Hide Chat' : 'Show Chat'}</span>
            </button>
            {audioUrl && (
              <button
                onClick={replayAudio}
                disabled={isThinking}
                className="flex items-center space-x-2 px-4 py-2 bg-[#ff5e00] hover:bg-[#ff7e30] disabled:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition-colors duration-200"
              >
                <Volume2 size={16} />
                <span>Replay Audio</span>
              </button>
            )}
            <button
              onClick={() => setActiveScreen('tictactoe')}
              className="flex items-center space-x-2 px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors duration-200 border border-[#ff5e00]"
            >
              <Gamepad2 size={16} />
              <span>Play Tic Tac Toe</span>
            </button>
          </div>
          
          {showChatHistory && (
            <div className="mt-4 p-3 bg-black bg-opacity-70 rounded-lg border border-[#ff5e00] text-white max-h-60 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-center text-gray-400 italic">No messages yet. Start the conversation!</p>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, index) => (
                    <div 
                      key={`msg-${index}-${msg.timestamp}`} 
                      className={`p-2 rounded-lg ${msg.role === 'user' ? 'bg-black text-white border border-white' : 'bg-black text-[#ff5e00] border border-[#ff5e00]'}`}
                    >
                      <div className="font-bold mb-1">{msg.role === 'user' ? 'You' : 'Ibrahim'}</div>
                      <div>{msg.content}</div>
                      <div className="text-xs opacity-50 text-right mt-1">{formatTime(msg.timestamp)}</div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <audio
        ref={audioRef}
        className="hidden"
        preload="auto"
        onEnded={handleAudioEnd}
      />

      {activeScreen === 'tictactoe' && (
        <RickTicTacToe onClose={() => setActiveScreen(null)} />
      )}
    </div>
  );
};

export default RickChatbot;
