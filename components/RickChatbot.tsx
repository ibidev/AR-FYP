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

  // Start a FRESH SpeechRecognition each time. Reusing one instance stops returning
  // results after the first recording in Chrome — creating a new one every time fixes
  // that. On a final transcript we auto-send (no need to press Enter).
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // tear down any previous instance
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }

    const recognition = new SpeechRecognition();
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.lang = 'en-US'; // force English so the mic doesn't default to the system locale

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      setIsListening(false);
      const clean = (transcript || '').trim();
      if (clean) {
        setInputMessage(clean);
        sendMessage(clean); // auto-send the voice note
      }
    };
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch (e) {
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    // Unlock audio on first interaction
    if (!audioUnlockedRef.current && audioRef.current) {
      audioRef.current.play().catch(() => {});
      audioRef.current.pause();
      audioUnlockedRef.current = true;
    }

    if (isListening) {
      try { recognitionRef.current && recognitionRef.current.stop(); } catch (e) {}
      setIsListening(false);
    } else {
      startListening();
    }
  };

  const handleAudioEnd = () => {
    setIsPlayingAudio(false);
  };

  const sendMessage = async (overrideText) => {
    // overrideText comes from the mic auto-send; onClick passes an event, so ignore non-strings.
    const text = (typeof overrideText === 'string' && overrideText.trim())
      ? overrideText.trim()
      : inputMessage.trim();
    if (!text || isLoading) return;

    // unlock audio on first interaction
    if (!audioUnlockedRef.current && audioRef.current) {
      audioRef.current.play().catch(() => {});
      audioRef.current.pause();
      audioUnlockedRef.current = true;
    }

    const userMessage = { role: 'user', content: text, timestamp: Date.now() };
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

  const busy = isLoading || isPlayingAudio || isThinking;

  const statusPill = isListening
    ? { label: 'LISTENING', color: '#ff5e00' }
    : isThinking
    ? { label: 'THINKING', color: '#ff5e00' }
    : isPlayingAudio
    ? { label: 'SPEAKING', color: '#ff5e00' }
    : null;

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', color: '#f2efeb', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: 16, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="lp-navdot" />
            <span className="lp-orb" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.22em' }}>IBRAHIM · DIGITAL TWIN</span>
          </div>
          {statusPill && (
            <span className="lp-mono" style={{ fontSize: 10, letterSpacing: '.16em', color: statusPill.color, padding: '5px 12px', border: `1px solid ${statusPill.color}55`, borderRadius: 99, background: 'rgba(255,94,0,.06)' }}>
              ● {statusPill.label}
            </span>
          )}
        </div>

        {/* 3D stage with portal rings */}
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 14, border: '1px solid rgba(255,94,0,.25)', background: 'radial-gradient(ellipse at 50% 40%, #17121a 0%, #0a0a0a 70%)', height: 'clamp(340px, 52vh, 600px)', marginBottom: 16 }}>
          {/* portal rings */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', height: '96%', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,94,0,.16) 0%, rgba(255,94,0,.05) 45%, transparent 70%)', filter: 'blur(2px)', animation: 'lp-portalPulse 5s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', height: '88%', aspectRatio: '1' }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', border: '1px solid rgba(255,94,0,.4)', borderTopColor: 'transparent', borderBottomColor: 'transparent', animation: 'lp-portalSpin 14s linear infinite' }} />
          </div>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', height: '74%', aspectRatio: '1' }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', border: '1px dashed rgba(255,94,0,.3)', animation: 'lp-portalSpinRev 22s linear infinite' }} />
          </div>

          {/* 3D model on top, transparent bg */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
            <Rick3DViewer
              isPlayingAudio={isPlayingAudio}
              isThinking={isThinking}
              isLoading={isLoading}
              modelUrl="/models/ib.glb"
              transparent
            />
          </div>

          <div className="lp-mono" style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 3, fontSize: 9.5, letterSpacing: '.2em', color: 'rgba(242,239,235,.4)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
            DRAG TO SPIN — LIVE WEBGL
          </div>
        </div>

        {/* control panel */}
        <div style={{ background: '#111', border: '1px solid rgba(242,239,235,.12)', borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask Ibrahim something..."
              disabled={busy}
              style={{ flex: 1, padding: '15px 18px', background: '#0d0d0d', border: '1px solid rgba(255,94,0,.35)', borderRadius: 8, color: '#f2efeb', fontSize: 15, fontFamily: 'Inter, sans-serif', outline: 'none' }}
            />
            <button
              onClick={toggleListening}
              disabled={busy}
              title="Speak"
              style={{ width: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid rgba(255,94,0,.35)', background: isListening ? '#ff5e00' : '#0d0d0d', color: isListening ? '#0d0d0d' : '#f2efeb', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy && !isListening ? 0.5 : 1 }}
            >
              {isListening ? <MicOff size={22} /> : <Mic size={22} />}
            </button>
            <button
              onClick={() => sendMessage()}
              disabled={busy || !inputMessage.trim()}
              title="Send"
              style={{ width: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: 'none', background: '#ff5e00', color: '#0d0d0d', cursor: busy || !inputMessage.trim() ? 'not-allowed' : 'pointer', opacity: busy || !inputMessage.trim() ? 0.5 : 1 }}
            >
              <Send size={22} />
            </button>
          </div>

          {/* control buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 16 }}>
            <button onClick={clearChat} className="lp-cta-ghost lp-orb" style={ctrlBtn}>
              <Trash2 size={14} /> <span>CLEAR</span>
            </button>
            <button onClick={toggleChatHistory} className="lp-cta-ghost lp-orb" style={ctrlBtn}>
              <MessageSquare size={14} /> <span>{showChatHistory ? 'HIDE CHAT' : 'SHOW CHAT'}</span>
            </button>
            {audioUrl && (
              <button onClick={replayAudio} disabled={isThinking} className="lp-cta lp-orb" style={{ ...ctrlBtn, opacity: isThinking ? 0.5 : 1 }}>
                <Volume2 size={14} /> <span>REPLAY</span>
              </button>
            )}
            <button onClick={() => setActiveScreen('tictactoe')} className="lp-cta-ghost lp-orb" style={ctrlBtn}>
              <Gamepad2 size={14} /> <span>TIC TAC TOE</span>
            </button>
          </div>

          {showChatHistory && (
            <div style={{ marginTop: 16, padding: 14, background: '#0a0a0a', border: '1px solid rgba(242,239,235,.1)', borderRadius: 10, maxHeight: 260, overflowY: 'auto' }}>
              {messages.length === 0 ? (
                <p className="lp-mono" style={{ textAlign: 'center', color: 'rgba(242,239,235,.4)', fontSize: 12, letterSpacing: '.1em' }}>NO MESSAGES YET — START THE CONVERSATION</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {messages.map((msg, index) => (
                    <div
                      key={`msg-${index}-${msg.timestamp}`}
                      style={{ padding: '10px 12px', borderRadius: 8, background: '#111', border: `1px solid ${msg.role === 'user' ? 'rgba(242,239,235,.18)' : 'rgba(255,94,0,.4)'}` }}
                    >
                      <div className="lp-orb" style={{ fontWeight: 700, fontSize: 11, letterSpacing: '.12em', marginBottom: 4, color: msg.role === 'user' ? '#f2efeb' : '#ff5e00' }}>
                        {msg.role === 'user' ? 'YOU' : 'IBRAHIM'}
                      </div>
                      <div style={{ fontSize: 14, lineHeight: 1.55, color: 'rgba(242,239,235,.85)' }}>{msg.content}</div>
                      <div className="lp-mono" style={{ fontSize: 9.5, opacity: 0.4, textAlign: 'right', marginTop: 4 }}>{formatTime(msg.timestamp)}</div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <audio ref={audioRef} style={{ display: 'none' }} preload="auto" onEnded={handleAudioEnd} />

      {activeScreen === 'tictactoe' && (
        <RickTicTacToe onClose={() => setActiveScreen(null)} />
      )}
    </div>
  );
};

// shared style for the control-row buttons (background comes from the lp-cta / lp-cta-ghost class)
const ctrlBtn = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 16px',
  fontSize: 11,
  cursor: 'pointer',
};

export default RickChatbot;
