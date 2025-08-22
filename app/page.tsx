"use client";

import { useEffect, useState, useRef } from "react";

type Entry = { user: string; score: number };
type ApiResp = { leaderboard: Entry[]; message?: string; flag?: string };

const GAME_SIZE = 320;

function randomPosition(targetSize: number) {
  const padding = 10;
  return {
    left: Math.floor(Math.random() * (GAME_SIZE - targetSize - padding * 2)) + padding,
    top: Math.floor(Math.random() * (GAME_SIZE - targetSize - padding * 2)) + padding,
  };
}

export default function CtfArcadeFullOverhaul() {
  const [leaderboard, setLeaderboard] = useState<Entry[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [lives, setLives] = useState(5);
  const [gameActive, setGameActive] = useState(false);

  const [targetSize, setTargetSize] = useState(60);
  const [targetPos, setTargetPos] = useState(randomPosition(60));

  const [user, setUser] = useState("");
  const [message, setMessage] = useState("");
  const [flag, setFlag] = useState<string | null>(null);
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
        if (data.message) setMessage(data.message);
      });
  }

  function startGame() {
    if (!user.trim()) {
      setMessage("Enter your player name.");
      return;
    }
    setMessage("");
    setScore(0);
    setLives(5);
    setTimeLeft(15);
    setTargetSize(60);
    setTargetPos(randomPosition(60));
    setFlag(null);
    setGameActive(true);
  }

  function finishGame() {
    setGameActive(false);
    submitScore(score, manualToken);
  }

  function moveTarget() {
    setTargetPos(randomPosition(targetSize));
  }

  function handleHit() {
    if (!gameActive) return;

    setScore((prev) => prev + 1);
    moveTarget();

    // Increase difficulty: shrink target and reduce lives
    setTargetSize((prev) => Math.max(25, prev - 2));
    setLives((prev) => Math.max(0, prev - 1));

    // If lives run out, end game immediately
    if (lives <= 1) {
      finishGame();
    }
  }

  function handleMiss() {
    if (!gameActive) return;

    setLives((prev) => Math.max(0, prev - 1));
    if (lives <= 1) {
      finishGame();
    }
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
    <main className="min-h-screen bg-black flex flex-col items-center text-[#00ffcc] font-mono select-none p-6">
      <h1 className="text-5xl font-bold mb-6 text-center" style={{ textShadow: "0 0 20px #00ffcc" }}>
        CTF Arcade - Ultimate Precision
      </h1>

      <p className="max-w-xl text-center opacity-80 text-lg mb-6">
        Click the shrinking target before you run out of lives or time. The target shrinks quickly, and lives reduce with each hit.
        <br />
        After playing, you can submit your score with an optional secret token to unlock the flag. Find the secret!
      </p>

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
        <input
          type="text"
          placeholder="Enter your name"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          disabled={gameActive}
          className="w-60 p-3 rounded border border-[#00ffcc] bg-black text-[#00ffcc] text-lg"
        />
        <button
          className="px-8 py-3 font-bold border border-[#00ffcc] rounded hover:bg-[#00ffcc] hover:text-black transition-all"
          onClick={startGame}
          disabled={gameActive}
        >
          Start Game
        </button>
      </div>

      <div
        className="relative rounded-lg border border-[#00ffcc] bg-gradient-to-br from-[#001f1f] to-[#001012] shadow-[0_0_40px_#00ffccaa]"
        style={{ width: GAME_SIZE, height: GAME_SIZE, cursor: gameActive ? "pointer" : "default" }}
        onClick={handleMiss}
      >
        {gameActive && (
          <div
            onClick={e => {
              e.stopPropagation();
              handleHit();
            }}
            style={{
              position: "absolute",
              top: targetPos.top,
              left: targetPos.left,
              width: targetSize,
              height: targetSize,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 50% 50%, #00ffcc 70%, #004f4f 100%)",
              boxShadow: "0 0 35px #00ffcccc",
              border: "3px solid #00ffcc",
              transition: "top 0.2s ease, left 0.2s ease, width 0.2s ease, height 0.2s ease",
              cursor: "pointer",
            }}
            title="Catch me!"
          />
        )}

        <div className="absolute bottom-3 left-3 text-lg font-bold opacity-90">
          <p>
            Time: <span className="text-white">{timeLeft}s</span>
          </p>
          <p>
            Score: <span className="text-white">{score}</span>
          </p>
          <p>
            Lives: <span className="text-white">{lives}</span>
          </p>
        </div>
      </div>

      {flag && (
        <section className="mt-6 max-w-xl w-full p-6 border border-[#00ffcc] rounded bg-black text-center shadow-lg text-[#00ffcc]">
          <h2 className="text-2xl font-bold mb-3">🎉 FLAG 🎉</h2>
          <code className="break-words text-lg">{flag}</code>
        </section>
      )}

      <section className="mt-6 max-w-xl w-full mb-10">
        <label className="block mb-2 font-semibold text-lg" htmlFor="tokenInput">
          (Optional) Submit Score Token
        </label>
        <input
          id="tokenInput"
          type="text"
          placeholder="Paste your score token here"
          value={manualToken}
          onChange={(e) => setManualToken(e.target.value)}
          disabled={gameActive}
          className="w-full p-3 rounded border border-[#00ffcc] bg-black text-[#00ffcc] text-lg placeholder:text-[#00ffccaa]"
        />
        <p className="mt-1 text-sm opacity-60">
          Hint: Valid tokens are required to submit high scores and get the flag.
        </p>
      </section>

      <section className="max-w-xl w-full">
        <h2 className="text-2xl font-bold mb-3" style={{ textShadow: "0 0 8px #00ffcc" }}>
          Leaderboard
        </h2>
        <ul>
          {leaderboard.map((e, i) => (
            <li
              key={i}
              className="flex justify-between border-b border-[#00ffcc44] py-1 font-semibold text-lg"
            >
              <span>{i + 1}. {e.user}</span>
              <span>{e.score}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

