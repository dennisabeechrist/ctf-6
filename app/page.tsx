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
  const [targetPos, setTargetPos] = useState({ top: "40%", left: "40%" });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // On mount fetch leaderboard
  useEffect(() => {
    fetch("/api/scores")
      .then((res) => res.json())
      .then((data: ApiResp) => {
        setLeaderboard(data.leaderboard);
        if(data.message) setMessage(data.message);
      });
  }, []);

  // Timer countdown
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
    moveTarget();
  }

  function finishGame() {
    setGameActive(false);
    submitScore();
  }

  function moveTarget() {
    const top = Math.floor(Math.random() * 70 + 10) + "%";
    const left = Math.floor(Math.random() * 70 + 10) + "%";
    setTargetPos({ top, left });
  }

  function handleDotClick() {
    if (!gameActive) return;
    setScore(score + 1);
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
    <main className="min-h-screen bg-black text-[#00ffcc] font-mono p-6 flex flex-col items-center">
      <h1 className="text-4xl mb-4">CTF Arcade – Catch the Dot</h1>
      <p className="mb-6 text-center max-w-xl">
        Click the moving dot as many times as possible in 30 seconds. Try to beat Admin's high score to get the flag.
      </p>

      <input
        type="text"
        placeholder="Enter player name"
        value={user}
        onChange={(e) => setUser(e.target.value)}
        disabled={gameActive}
        className="mb-4 p-2 rounded border border-[#00ffcc] bg-black text-[#00ffcc] w-64 text-lg"
      />

      <button
        onClick={startGame}
        disabled={gameActive}
        className="mb-6 px-6 py-2 border border-[#00ffcc] rounded hover:bg-[#00ffcc] hover:text-black"
      >
        Start Game
      </button>

      <div className="relative border border-[#00ffcc] rounded-md w-80 h-80 bg-black select-none">
        {gameActive && (
          <div
            onClick={handleDotClick}
            style={{ top: targetPos.top, left: targetPos.left }}
            className="w-10 h-10 bg-[#00ffcc] rounded-full absolute cursor-pointer shadow-[0_0_15px_#00ffcc]"
          />
        )}

        <div className="absolute bottom-2 left-2 text-sm opacity-80">
          <p>Time Left: {timeLeft}</p>
          <p>Score: {score}</p>
        </div>
      </div>

      {flag && (
        <div className="mt-6 p-4 border border-[#00ffcc] rounded w-full max-w-xl text-center break-words">
          <p className="mb-2 text-xl">🎉 <strong>FLAG</strong> 🎉</p>
          <code>{flag}</code>
        </div>
      )}

      {message && <p className="mt-4 max-w-xl text-center opacity-80">{message}</p>}

      <section className="mt-12 w-full max-w-xl">
        <h2 className="text-2xl mb-3">Leaderboard</h2>
        <ul>
          {leaderboard.map((entry, i) => (
            <li key={i} className="flex justify-between border-b border-[#00ffcc] pb-1 mb-1">
              <span>{i + 1}. {entry.user}</span>
              <span>{entry.score}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
