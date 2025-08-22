"use client";

import { useEffect, useState, useRef } from "react";

type Entry = { user: string; score: number };
type ApiResp = { leaderboard: Entry[]; message?: string; flag?: string };

export default function ArcadeGame() {
  const [leaderboard, setLeaderboard] = useState<Entry[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30); // seconds game duration
  const [gameActive, setGameActive] = useState(false);
  const [flag, setFlag] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState("");
  const [targetPosition, setTargetPosition] = useState({ top: "40%", left: "40%" });
  
  const intervalRef = useRef<NodeJS.Timer | null>(null);

  // Fetch the leaderboard on mount
  useEffect(() => {
    fetch("/api/scores")
      .then(res => res.json())
      .then((data: ApiResp) => {
        setLeaderboard(data.leaderboard);
        if(data.message) setMessage(data.message);
      });
  }, []);

  // Timer countdown
  useEffect(() => {
    if (gameActive && timeLeft > 0) {
      intervalRef.current = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && gameActive) {
      endGame();
    }

    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [timeLeft, gameActive]);

  function startGame() {
    if (!user.trim()) {
      setMessage("Please enter a player name to start.");
      return;
    }
    setMessage("");
    setScore(0);
    setTimeLeft(30);
    setGameActive(true);
    setFlag(null);
    moveTarget();
  }

  function endGame() {
    setGameActive(false);
    submitScore();
  }

  function moveTarget() {
    const top = Math.floor(Math.random() * 70) + 10 + "%"; // between 10% and 80%
    const left = Math.floor(Math.random() * 70) + 10 + "%";
    setTargetPosition({ top, left });
  }

  function handleClickTarget() {
    if (!gameActive) return;
    setScore(score + 1);
    moveTarget();
  }

  function submitScore() {
    fetch(`/api/scores?name=${encodeURIComponent(user)}&score=${score}`, {
      method: "GET",
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
    <main className="min-h-screen bg-black text-[#00ffcc] font-mono p-6 flex flex-col items-center">
      <h1 className="text-4xl mb-4">CTF Arcade – Catch the Dot</h1>
      <p className="mb-6 text-center">
        Click the moving dot as many times as you can in 30 seconds. Beat Admin's score to win the flag.
      </p>

      <input
        type="text"
        placeholder="Enter your name"
        value={user}
        onChange={(e) => setUser(e.target.value)}
        disabled={gameActive}
        className="mb-4 p-2 rounded bg-black border border-[#00ffcc] text-[#00ffcc] text-lg w-64"
      />

      <button
        className="mb-4 px-6 py-2 border border-[#00ffcc] rounded hover:bg-[#00ffcc] hover:text-black"
        onClick={startGame}
        disabled={gameActive}
      >
        Start Game
      </button>

      <div className="relative w-80 h-80 border border-[#00ffcc] rounded-md bg-black overflow-hidden select-none">
        {/* Target Dot */}
        {gameActive && (
          <div
            onClick={handleClickTarget}
            style={{ top: targetPosition.top, left: targetPosition.left }}
            className="w-10 h-10 bg-[#00ffcc] rounded-full absolute cursor-pointer shadow-[0_0_10px_#00ffcc]"
          />
        )}

        {/* Displayed Score and Timer */}
        <div className="absolute bottom-2 left-2 text-sm opacity-80">
          <p>Time Left: {timeLeft}s</p>
          <p>Score: {score}</p>
        </div>
      </div>

      {flag && (
        <div className="mt-6 p-4 border border-[#00ffcc] rounded w-full max-w-xl text-center break-words">
          <p className="mb-2 text-xl">🎉 <strong>FLAG</strong> 🎉</p>
          <code>{flag}</code>
        </div>
      )}

      {message && (
        <p className="mt-4 text-sm opacity-80 max-w-xl text-center">{message}</p>
      )}

      <section className="mt-12 w-full max-w-xl">
        <h2 className="text-2xl mb-3">Leaderboard</h2>
        <ul className="space-y-2">
          {leaderboard.map((e, i) => (
            <li key={i} className="flex justify-between">
              <span>{i + 1}. {e.user}</span>
              <span>{e.score}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
