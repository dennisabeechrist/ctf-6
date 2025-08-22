"use client";

import { useEffect, useState, useRef } from "react";

type Entry = { user: string; score: number };
type ApiResp = { leaderboard: Entry[]; message?: string; flag?: string };

// Helper: Generate random int between min and max inclusive
const randBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export default function HardCtfArcade() {
  const [leaderboard, setLeaderboard] = useState<Entry[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30); // total time or timer
  const [dotSize, setDotSize] = useState(50);
  const [gameActive, setGameActive] = useState(false);
  const [flag, setFlag] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState("");
  const [targetPos, setTargetPos] = useState({ top: 0, left: 0 });
  const [lives, setLives] = useState(3); // limited misses allowed
  const [manualToken, setManualToken] = useState("");

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

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

  function fetchLeaderboard() {
    fetch("/api/scores")
      .then((res) => res.json())
      .then((data: ApiResp) => {
        setLeaderboard(data.leaderboard);
        if(data.message) setMessage(data.message);
      });
  }

  function startGame() {
    if (!user.trim()) {
      setMessage("Enter your player name.");
      return;
    }
    setMessage("");
    setScore(0);
    setTimeLeft(30);
    setLives(3);
    setDotSize(50);
    setGameActive(true);
    setFlag(null);
    moveTarget();
  }

  function finishGame() {
    setGameActive(false);
    submitScore(score, manualToken);
  }

  function moveTarget() {
    const gameSize = 320;
    const padding = 10;
    const left = randBetween(padding, gameSize - dotSize - padding);
    const top = randBetween(padding, gameSize - dotSize - padding);
    setTargetPos({ left, top });
    // Shrink dot size slightly making next click harder (min 20)
    setDotSize((size) => Math.max(20, size - 3));
  }

  function handleDotClick() {
    if (!gameActive) return;
    setScore((s) => s + 1);
    // Reward: Add 2 seconds to timer per hit, max 60s total
    setTimeLeft((t) => Math.min(60, t + 2));
    moveTarget();
  }

  function handleMiss() {
    if (!gameActive) return;
    setLives((l) => {
      const newLives = l - 1;
      if (newLives <= 0) {
        finishGame();
      }
      return newLives;
    });
  }

  function submitScore(submittedScore: number, token: string) {
    const url = new URL("/api/scores", location.origin);
    url.searchParams.set("name", user);
    url.searchParams.set("score", String(submittedScore));

    if (token.trim().length > 0) {
      url.searchParams.set("token", token.trim());
    }

    fetch(url.toString(), { cache: "no-store" })
      .then((res) => res.json())
      .then((data: ApiResp) => {
        setLeaderboard(data.leaderboard);
        if (data.flag) setFlag(data.flag);
        if (data.message) setMessage(data.message);
      });
  }

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-[#00ffcc] font-mono flex flex-col items-center select-none">
      <h1 className="text-5xl font-bold mb-6 text-center" style={{ textShadow: "0 0 15px #00ffcc" }}>
        CTF Arcade – Catch the Shrinking Dot
      </h1>

      <p className="mb-6 max-w-xl text-center text-lg opacity-80">
        The dot shrinks and the clock runs out quickly. You have <b>{lives}</b> misses allowed.
        After game ends, optionally submit a <i>score token</i> for a surprise.
      </p>

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
        <input
          type="text"
          placeholder="Enter player name"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          disabled={gameActive}
          className="p-2 rounded border border-[#00ffcc] bg-black text-[#00ffcc] w-60 text-lg sm:text-xl"
        />
        <button
          onClick={startGame}
          disabled={gameActive}
          className="px-8 py-3 border border-[#00ffcc] rounded font-bold hover:bg-[#00ffcc] hover:text-black transition"
        >
          Start Game
        </button>
      </div>

      <div
        className="relative w-80 h-80 bg-gradient-to-br from-[#002622] to-[#001815] rounded-md border border-[#00ffcc] mb-6 shadow-[0_0_40px_#00ffccaa]"
        onClick={handleMiss}
      >
        {gameActive && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleDotClick();
            }}
            title="Catch me!"
            style={{
              position: "absolute",
              top: targetPos.top,
              left: targetPos.left,
              width: `${dotSize}px`,
              height: `${dotSize}px`,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, #00ffcc 60%, #004f4f 100%)",
              boxShadow: "0 0 30px #00ffcccc, 0 0 10px #00ffccaa",
              cursor: "pointer",
              transition: "top 0.15s ease, left 0.15s ease, width 0.15s ease, height 0.15s ease",
              border: "2px solid #00ffcc",
            }}
          />
        )}
        <div className="absolute bottom-3 left-3 text-lg font-bold opacity-90">
          <p>Time Left: <span className="text-white">{timeLeft}s</span></p>
          <p>Score: <span className="text-white">{score}</span></p>
          <p>Misses Left: <span className="text-white">{lives}</span></p>
        </div>
      </div>

      {flag && (
        <div className="max-w-xl w-full p-6 border border-[#00ffcc] rounded shadow-lg bg-black text-center mb-6">
          <h2 className="text-2xl font-semibold mb-3 text-[#00ffcc]">🎉 FLAG 🎉</h2>
          <code className="break-words text-lg">{flag}</code>
        </div>
      )}

      {/*
        Manual score token input for intended exploit
      */}
      <div className="max-w-xl w-full mb-8">
        <label className="block mb-1 font-semibold text-xl" htmlFor="score-token">
          (Optional) Submit Score Token
        </label>
        <input
          id="score-token"
          type="text"
          placeholder="Paste your score token here"
          value={manualToken}
          onChange={(e) => setManualToken(e.target.value)}
          disabled={gameActive}
          className="w-full p-3 rounded border border-[#00ffcc] bg-black text-[#00ffcc] text-lg placeholder:text-[#00ffcc99]"
        />
        <p className="mt-1 text-sm opacity-60">
          Some players discovered a secret way to submit scores with a valid token to get the flag...
        </p>
      </div>

      <section className="max-w-xl w-full">
        <h2 className="text-2xl font-bold mb-3 text-[#00ffcc] text-shadow-md">Leaderboard</h2>
        <ul className="divide-y divide-[#00ffcc44]">
          {leaderboard.map((e, i) => (
            <li key={i} className="flex justify-between text-lg py-1 font-semibold">
              <span>{i + 1}. {e.user}</span>
              <span>{e.score}</span>
            </li>
          ))}
        </ul>
      </section>

      <style>{`
        .text-shadow-md {
          text-shadow: 0 0 8px #00ffccbb;
        }
      `}</style>
    </main>
  );
}
