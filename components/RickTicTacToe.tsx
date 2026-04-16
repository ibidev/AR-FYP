import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const WIN_COMBOS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

const RICK_WIN = [
  "Ha! Did you really think you could beat the smartest man in the universe? Pathetic.",
  "I've defeated galactic overlords. You never stood a chance.",
  "Wubba lubba dub dub! That means I won, genius.",
  "I calculated your every move 47 steps ahead. This was over before it started.",
  "You just got beaten at Tic Tac Toe by a man trapped in a poster. Let that sink in.",
];
const RICK_LOSE = [
  "Okay okay, you got lucky. The quantum fluctuations were clearly in your favor.",
  "I let you win. Obviously. I'm testing your confidence levels for an experiment.",
  "Fine. You won. But can you build a portal gun? Didn't think so.",
  "Enjoy it. There are infinite universes where I win. This is just a weird one.",
  "Congratulations, you beat a genius trapped in 2D space. Real impressive.",
];
const RICK_DRAW = [
  "A draw? Against me? You should be proud. Most people lose in 3 moves.",
  "Interesting. You're not as dumb as you look. Still pretty dumb though.",
  "A tie. The mathematical equivalent of nothing mattering. Classic.",
  "You managed not to lose. That's something, I guess.",
];
const RICK_MOVE = [
  "Really? THAT'S your move?",
  "Ugh, predictable.",
  "Bold strategy. Wrong, but bold.",
  "I've seen better moves from a Gazorpazorp infant.",
  "Oh interesting. Still losing though.",
  "Sure, go ahead. It won't help you.",
];

function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function checkWinner(board) {
  for (const [a, b, c] of WIN_COMBOS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c])
      return { winner: board[a], combo: [a, b, c] };
  }
  return null;
}

function getBestMove(board) {
  for (const [a, b, c] of WIN_COMBOS) {
    const v = [board[a], board[b], board[c]];
    if (v.filter(x => x === 'I').length === 2 && v.includes(null)) return [a,b,c][v.indexOf(null)];
  }
  for (const [a, b, c] of WIN_COMBOS) {
    const v = [board[a], board[b], board[c]];
    if (v.filter(x => x === 'X').length === 2 && v.includes(null)) return [a,b,c][v.indexOf(null)];
  }
  if (!board[4]) return 4;
  const corners = [0, 2, 6, 8].filter(i => !board[i]);
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
  return board.map((v, i) => v === null ? i : -1).filter(i => i !== -1)[0];
}

export default function RickTicTacToe({ onClose }) {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [playerTurn, setPlayerTurn] = useState(true);
  const [status, setStatus] = useState('playing');
  const [winCombo, setWinCombo] = useState(null);
  const [rickSpeech, setRickSpeech] = useState("Oh great, another human who thinks they can beat me. Go ahead, make your move.");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [score, setScore] = useState({ p: 0, r: 0, d: 0 });
  const [animating, setAnimating] = useState(false);
  const audioRef = useRef(null);

  const speak = async (text) => {
    setRickSpeech(text);
    setIsSpeaking(true);
    try {
      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.audioUrl && audioRef.current) {
        audioRef.current.src = data.audioUrl;
        audioRef.current.load();
        await audioRef.current.play().catch(() => {});
      } else {
        setIsSpeaking(false);
      }
    } catch (e) {
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    speak("Oh great, another human who thinks they can beat me. Go ahead, make your move.");
  }, []);

  useEffect(() => {
    if (!playerTurn && status === 'playing') {
      setAnimating(true);
      const timer = setTimeout(() => {
        const newBoard = [...board];
        const move = getBestMove(newBoard);
        newBoard[move] = 'I';
        const result = checkWinner(newBoard);
        if (result) {
          setWinCombo(result.combo);
          setStatus('lost');
          setScore(s => ({ ...s, r: s.r + 1 }));
          speak(rnd(RICK_WIN));
        } else if (newBoard.every(Boolean)) {
          setStatus('draw');
          setScore(s => ({ ...s, d: s.d + 1 }));
          speak(rnd(RICK_DRAW));
        } else {
          speak(rnd(RICK_MOVE));
          setPlayerTurn(true);
        }
        setBoard(newBoard);
        setAnimating(false);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [playerTurn, board, status]);

  const handleClick = (i) => {
    if (!playerTurn || board[i] || status !== 'playing' || animating) return;
    const newBoard = [...board];
    newBoard[i] = 'X';
    setBoard(newBoard);
    const result = checkWinner(newBoard);
    if (result) {
      setWinCombo(result.combo);
      setStatus('won');
      setScore(s => ({ ...s, p: s.p + 1 }));
      speak(rnd(RICK_LOSE));
      return;
    }
    if (newBoard.every(Boolean)) {
      setStatus('draw');
      setScore(s => ({ ...s, d: s.d + 1 }));
      speak(rnd(RICK_DRAW));
      return;
    }
    setPlayerTurn(false);
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setPlayerTurn(true);
    setStatus('playing');
    setWinCombo(null);
    const lines = [
      "Fine, another round. Don't expect me to go easy on you.",
      "Again? Fine. I enjoy watching you fail repeatedly.",
      "Oh you want more? Glutton for punishment. I respect it.",
    ];
    speak(rnd(lines));
  };

  const getCellClass = (i) => {
    const isWin = winCombo?.includes(i);
    const val = board[i];
    const base = "relative w-full flex items-center justify-center font-black select-none cursor-pointer transition-all duration-200 rounded-xl border-2";
    if (isWin && val === 'X') return `${base} border-green-500 bg-green-950 text-green-400 scale-105`;
    if (isWin && val === 'I') return `${base} border-[#ff5e00] bg-[#1a0800] text-[#ff5e00] scale-105`;
    if (val === 'X') return `${base} border-white/20 bg-white/5 text-white`;
    if (val === 'I') return `${base} border-[#ff5e00]/40 bg-[#ff5e00]/5 text-[#ff5e00]`;
    return `${base} border-white/10 bg-white/5 hover:border-[#ff5e00]/50 hover:bg-[#ff5e00]/10`;
  };

  const statusText = {
    playing: playerTurn ? (animating ? '' : 'Your move, genius.') : 'Ibrahim is thinking...',
    won: 'You win! ...This time.',
    lost: 'Ibrahim wins. Obviously.',
    draw: "It's a draw. How boring.",
  }[status];

  const statusColor = {
    playing: 'text-white/60',
    won: 'text-green-400',
    lost: 'text-[#ff5e00]',
    draw: 'text-amber-400',
  }[status];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: '#0d0d0d', border: '2px solid #ff5e00' }}
      >
        {/* Header */}
        <div style={{ background: '#111', borderBottom: '1px solid #ff5e00' }} className="flex items-center justify-between px-5 py-3">
          <div>
            <h2 style={{ color: '#ff5e00', fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>Ibrahim's Tic Tac Toe</h2>
            <p style={{ color: '#555', fontSize: 11, marginTop: 2 }}>You: X &nbsp;|&nbsp; Ibrahim: I</p>
          </div>
          <button onClick={onClose} style={{ color: '#555', padding: 4 }} className="hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scoreboard */}
        <div style={{ borderBottom: '1px solid #1a1a1a' }} className="flex justify-around py-3">
          {[['You', score.p, '#fff'], ['Draws', score.d, '#f59e0b'], ['Ibrahim', score.r, '#ff5e00']].map(([lbl, val, col]) => (
            <div key={String(lbl)} className="text-center">
              <div style={{ color: String(col), fontSize: 22, fontWeight: 700 }}>{val}</div>
              <div style={{ color: '#444', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Rick speech bubble */}
        <div className="mx-3 mt-3 p-3 rounded-xl relative" style={{ background: '#0f0800', border: '1px solid rgba(255,94,0,0.25)' }}>
          <div style={{ position: 'absolute', top: -8, left: 12, background: '#0f0800', padding: '0 6px', color: '#ff5e00', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>IBRAHIM SAYS</div>
          <p style={{ color: '#fff', fontSize: 13, lineHeight: 1.5 }}>{rickSpeech}</p>
          {isSpeaking && (
            <div className="flex items-center gap-1 mt-2">
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff5e00', animation: `bounce 0.8s ${i * 0.15}s infinite` }} />
              ))}
              <span style={{ color: '#ff5e0077', fontSize: 10, marginLeft: 4 }}>speaking...</span>
            </div>
          )}
        </div>

        {/* Status */}
        <p className={`text-center text-sm font-semibold mt-3 ${statusColor}`}>{statusText}</p>

        {/* Result banner */}
        {status !== 'playing' && (
          <div className="mx-3 mt-2 py-2 px-3 rounded-xl text-center font-bold text-sm"
            style={{
              background: status === 'won' ? '#052010' : status === 'lost' ? '#150500' : '#150e00',
              color: status === 'won' ? '#4ade80' : status === 'lost' ? '#ff5e00' : '#f59e0b',
              border: `1px solid ${status === 'won' ? '#4ade8033' : status === 'lost' ? '#ff5e0033' : '#f59e0b33'}`
            }}>
            {status === 'won' ? 'Victory! Ibrahim is furious.' : status === 'lost' ? 'Ibrahim wins again. Classic.' : 'Draw. The universe is indifferent.'}
          </div>
        )}

        {/* Board */}
        <div className="grid grid-cols-3 gap-2 p-3" style={{ gridTemplateRows: 'repeat(3, 1fr)' }}>
          {board.map((val, i) => (
            <div
              key={i}
              className={getCellClass(i)}
              style={{ aspectRatio: '1', fontSize: 30 }}
              onClick={() => handleClick(i)}
            >
              {val}
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-2 px-3 pb-4">
          <button
            onClick={reset}
            style={{ flex: 1, padding: '10px 0', background: '#ff5e00', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            {status === 'playing' ? 'Restart' : 'Play Again'}
          </button>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '10px 0', background: 'transparent', color: '#555', border: '1px solid #333', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Back to Chat
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>

      <audio ref={audioRef} className="hidden" preload="auto" onEnded={() => setIsSpeaking(false)} />
    </div>
  );
}
