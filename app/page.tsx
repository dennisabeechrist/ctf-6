"use client";

import { useEffect, useState, useRef } from "react";

type Entry = { user: string; score: number };
type ApiResp = { leaderboard: Entry[]; message?: string; flag?: string };

export default function CtfArcadeGame() {
  const [leaderboard, setLeaderboard] = useState<Entry[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameActive, setGameActive] = useState(false);
  const [flag, setFlag] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState("");
  const [targetPos, setTargetPos] = useState({ top: 120, left: 120 });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Get leaderboard on mount
  useEffect(() => {
    fetch("/api/scores")
      .then((res) => res.json())
      .then((data: ApiResp) => {
        setLeaderboard(data.leaderboard);
        if(data.message) setMessage(data.message);
      });
  }, []);

  // Countdown timer
  useEffect(() => {
    if (gameActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && gameActive) {
      finishGame();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, gameActive]);

  function startGame() {
    if (!user.trim()) {
      setMessage("Please enter your player name.");
      return;
    }
    setMessage("");
    setScore(0);
    setTimeLeft(30);
    setGameActive(true);
    setFlag(null);
    moveTarget(); // Dot always appears at game start
  }

  function finishGame() {
    setGameActive(false);
    submitScore();
  }

  function moveTarget() {
    const gameSize = 320; // px, matches CSS .game-area
    const dotSize = 50; // px
    const padding = 10;
    // Random position inside game area
    const left = Math.floor(Math.random() * (gameSize - dotSize - padding*2)) + padding;
    const top = Math.floor(Math.random() * (gameSize - dotSize - padding*2)) + padding;
    setTargetPos({ left, top });
  }

  function handleDotClick() {
    if (!gameActive) return;
    setScore(s => s + 1);
    moveTarget();
  }

  function submitScore() {
    fetch(`/api/scores?name=${encodeURIComponent(user)}&score=${score}`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data: ApiResp) => {
        setLeaderboard(data.leaderboard);
        if (data.flag) setFlag(data.flag);
        if (data.message) setMessage(data.message);
      });
  }

  return (
    <main
      className="min-h-screen bg-black text-[#00ffcc] font-mono flex flex-col items-center pt-6"
      style={{ letterSpacing: "1px" }}
    >
      <h1 className="text-4xl mb-3 font-bold" style={{ textShadow: "0 0 14px #00ffcc" }}>CTF Arcade – Catch the Dot</h1>
      <p className="mb-5 text-center max-w-xl" style={{ fontSize: "1.25rem" }}>
        Click the glowing dot as many times as possible in <span className="font-bold">30 seconds</span>.<br />
        Try to beat Admin's high score for the flag!
      </p>

      <div className="mb-6 flex gap-3 items-center">
        <input
          type="text"
          placeholder="Enter player name"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          disabled={gameActive}
          className="p-2 rounded border border-[#00ffcc] bg-black text-[#00ffcc] w-48 text-lg"
        />
        <button
          onClick={startGame}
          disabled={gameActive}
          className="px-6 py-2 border border-[#00ffcc] rounded font-bold hover:bg-[#00ffcc] hover:text-black arcade-btn"
        >
          Start Game
        </button>
      </div>

      <div
        className="game-area relative rounded-lg bg-neutral-900 border border-[#00ffcc] mb-6"
        style={{
          width: "320px",
          height: "320px",
          boxShadow: "0 0 30px #00ffcc44"
        }}
      >
        {gameActive && (
          <div
            onClick={handleDotClick}
            style={{
              position: "absolute",
              top: targetPos.top,
              left: targetPos.left,
              width: "50px",
              height: "50px",
              borderRadius: "50%",
              background: "radial-gradient(circle at 60% 50%, #00ffcc 70%, #0ff 90%, #00333a 100%)",
              boxShadow: "0 0 35px #00ffcc88, 0 0 6px #00ffcc",
              cursor: "pointer",
              border: "3px solid #00ffcc",
              transition: "top 0.15s, left 0.15s"
            }}
            title="Catch me!"
          />
        )}

        <div className="absolute bottom-2 left-2 text-sm opacity-90">
          <p style={{ fontWeight: "bold", fontSize: "1.1rem" }}>Time Left: <span className="text-[#fff]">{timeLeft}</span></p>
          <p style={{ fontWeight: "bold", fontSize: "1.1rem" }}>Score: <span className="text-[#fff]">{score}</span></p>
        </div>
      </div>

      {flag && (
        <div className="mt-6 p-4 border border-[#00ffcc] rounded w-full max-w-xl text-center break-words bg-black" style={{ boxShadow:"0 0 20px #00ffcc99" }}>
          <p className="mb-2 text-xl font-bold text-[#fff]">🎉 FLAG 🎉</p>
          <code className="text-[#00ffcc] text-lg">{flag}</code>
        </div>
      )}

      {message && (
        <p className="mt-4 max-w-xl text-center" style={{color: "#00ffcc"}}>{message}</p>
      )}

      <section className="mt-12 w-full max-w-xl">
        <h2 className="text-2xl mb-3 font-bold" style={{textShadow:"0 0 8px #00ffcc"}}>Leaderboard</h2>
        <ul>
          {leaderboard.map((entry, i) => (
            <li
              key={i}
              className="flex justify-between border-b border-[#00ffcc] pb-1 mb-1"
              style={{fontWeight:"bold", fontSize:"1.1rem"}}
            >
              <span>{i + 1}. {entry.user}</span>
              <span>{entry.score}</span>
            </li>
          ))}
        </ul>
      </section>

      <style>
        {`
        .arcade-btn {
          font-size: 1.15rem;
          letter-spacing: 2px;
          box-shadow: 0 0 8px #00ffcc66;
        }
        `}
      </style>
    </main>
  );
}
