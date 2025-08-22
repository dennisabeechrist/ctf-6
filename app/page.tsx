"use client";

import { useEffect, useState, useRef, useCallback } from "react";

type Entry = { user: string; score: number; timestamp: number };
type ApiResp = { leaderboard: Entry[]; message?: string; flag?: string; hint?: string };

const GAME_SIZE = 400;
const INITIAL_TARGET_SIZE = 50;
const MIN_TARGET_SIZE = 25;
const GAME_DURATION = 20;

interface Position {
  x: number;
  y: number;
}

interface GameState {
  score: number;
  timeLeft: number;
  lives: number;
  targetSize: number;
  targetPos: Position;
  speed: number;
  combo: number;
}

export default function UltimateCtfArcade() {
  // Game state
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    timeLeft: GAME_DURATION,
    lives: 3,
    targetSize: INITIAL_TARGET_SIZE,
    targetPos: { x: 200, y: 200 },
    speed: 1000,
    combo: 0,
  });

  const [gameActive, setGameActive] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [user, setUser] = useState("");
  const [leaderboard, setLeaderboard] = useState<Entry[]>([]);
  const [message, setMessage] = useState("");
  const [flag, setFlag] = useState<string | null>(null);
  const [hint, setHint] = useState<string>("");
  const [manualToken, setManualToken] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);
  
  // Animation states
  const [hitAnimation, setHitAnimation] = useState(false);
  const [missAnimation, setMissAnimation] = useState(false);
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number}>>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const moveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const particleIdRef = useRef(0);

  const generatePosition = useCallback((targetSize: number): Position => {
    const padding = 20;
    return {
      x: Math.random() * (GAME_SIZE - targetSize - padding * 2) + padding,
      y: Math.random() * (GAME_SIZE - targetSize - padding * 2) + padding,
    };
  }, []);

  const createParticles = useCallback((x: number, y: number) => {
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: particleIdRef.current++,
      x: x + Math.random() * 40 - 20,
      y: y + Math.random() * 40 - 20,
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 1000);
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  // Main game timer
  useEffect(() => {
    if (gameActive && gameState.timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setGameState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
      }, 1000);
    } else if (gameState.timeLeft === 0 && gameActive) {
      endGame();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [gameActive, gameState.timeLeft]);

  // Auto-move target
  useEffect(() => {
    if (gameActive && gameState.speed > 0) {
      moveTimerRef.current = setTimeout(() => {
        moveTarget();
      }, gameState.speed);
    }
    return () => {
      if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
    };
  }, [gameActive, gameState.targetPos, gameState.speed]);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch("/api/scores");
      const data: ApiResp = await res.json();
      setLeaderboard(data.leaderboard);
      if (data.message) setMessage(data.message);
      if (data.hint) setHint(data.hint);
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    }
  };

  const startGame = () => {
    if (!user.trim()) {
      setMessage("❌ Enter your player name to start!");
      return;
    }
    
    const initialPos = generatePosition(INITIAL_TARGET_SIZE);
    setGameState({
      score: 0,
      timeLeft: GAME_DURATION,
      lives: 3,
      targetSize: INITIAL_TARGET_SIZE,
      targetPos: initialPos,
      speed: 2000,
      combo: 0,
    });
    
    setGameActive(true);
    setGameStarted(true);
    setMessage("");
    setFlag(null);
    setShowTokenInput(false);
  };

  const endGame = () => {
    setGameActive(false);
    setShowTokenInput(true);
    submitScore(gameState.score, manualToken);
  };

  const moveTarget = () => {
    if (!gameActive) return;
    
    const newPos = generatePosition(gameState.targetSize);
    setGameState(prev => ({ 
      ...prev, 
      targetPos: newPos,
      combo: 0 // Reset combo when target moves automatically
    }));
  };

  const handleTargetHit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!gameActive) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    createParticles(x, y);
    setHitAnimation(true);
    setTimeout(() => setHitAnimation(false), 200);

    setGameState(prev => {
      const newCombo = prev.combo + 1;
      const comboBonus = Math.floor(newCombo / 3);
      const basePoints = 10;
      const sizeBonus = Math.floor((INITIAL_TARGET_SIZE - prev.targetSize) / 2);
      const points = basePoints + comboBonus + sizeBonus;
      
      const newScore = prev.score + points;
      const newTargetSize = Math.max(MIN_TARGET_SIZE, prev.targetSize - 1);
      const newSpeed = Math.max(800, prev.speed - 50);
      const newPos = generatePosition(newTargetSize);
      
      return {
        ...prev,
        score: newScore,
        targetSize: newTargetSize,
        targetPos: newPos,
        speed: newSpeed,
        combo: newCombo,
      };
    });
  };

  const handleMiss = () => {
    if (!gameActive) return;
    
    setMissAnimation(true);
    setTimeout(() => setMissAnimation(false), 300);

    setGameState(prev => {
      const newLives = prev.lives - 1;
      if (newLives <= 0) {
        setTimeout(endGame, 500);
      }
      return {
        ...prev,
        lives: newLives,
        combo: 0,
      };
    });
  };

  const submitScore = async (score: number, token: string) => {
    try {
      const url = new URL("/api/scores", location.origin);
      url.searchParams.set("name", user);
      url.searchParams.set("score", String(score));
      if (token.trim()) {
        url.searchParams.set("token", token.trim());
      }

      const res = await fetch(url.toString(), { cache: "no-store" });
      const data: ApiResp = await res.json();
      
      setLeaderboard(data.leaderboard);
      if (data.flag) setFlag(data.flag);
      if (data.message) setMessage(data.message);
      if (data.hint) setHint(data.hint);
    } catch (error) {
      console.error("Failed to submit score:", error);
      setMessage("❌ Failed to submit score. Try again.");
    }
  };

  const handleTokenSubmit = () => {
    if (manualToken.trim()) {
      submitScore(gameState.score, manualToken);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-cyan-400 font-mono select-none overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center p-6">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent animate-pulse">
            CTF ARCADE
          </h1>
          <h2 className="text-2xl font-semibold text-cyan-300 mb-2">PRECISION STRIKER</h2>
          <p className="max-w-2xl text-lg text-gray-300 leading-relaxed">
            Hit the shrinking, moving targets before time runs out. Each hit increases difficulty but rewards more points.
            <br />
            <span className="text-cyan-400 font-semibold">Build combos</span> for bonus points and discover the secret to unlock the flag!
          </p>
        </header>

        {/* Game Controls */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center">
          <input
            type="text"
            placeholder="Enter your codename"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            disabled={gameActive}
            className="w-64 p-3 rounded-lg border border-cyan-500 bg-black/50 text-cyan-400 text-lg placeholder:text-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all"
          />
          <button
            onClick={startGame}
            disabled={gameActive}
            className="px-8 py-3 font-bold text-lg border-2 border-cyan-500 rounded-lg hover:bg-cyan-500 hover:text-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-cyan-500/50"
          >
            {gameActive ? "GAME ACTIVE" : "START MISSION"}
          </button>
        </div>

        {/* Game Area */}
        <div className="relative mb-8">
          <div
            className={`relative rounded-xl border-2 border-cyan-500 bg-black/30 backdrop-blur-sm shadow-2xl transition-all duration-300 ${
              hitAnimation ? "shadow-green-500/50 scale-105" : ""
            } ${missAnimation ? "shadow-red-500/50" : ""}`}
            style={{ width: GAME_SIZE, height: GAME_SIZE }}
            onClick={handleMiss}
          >
            {/* Game Stats Overlay */}
            <div className="absolute top-4 left-4 z-20">
              <div className="bg-black/70 rounded-lg p-3 border border-cyan-500/30">
                <div className="text-lg font-bold">
                  <div className="flex items-center gap-2">
                    <span>⏱️</span>
                    <span className={gameState.timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-white"}>
                      {gameState.timeLeft}s
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🎯</span>
                    <span className="text-white">{gameState.score}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>❤️</span>
                    <span className={gameState.lives <= 1 ? "text-red-400 animate-pulse" : "text-white"}>
                      {gameState.lives}
                    </span>
                  </div>
                  {gameState.combo > 0 && (
                    <div className="flex items-center gap-2">
                      <span>🔥</span>
                      <span className="text-yellow-400">x{gameState.combo}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Target */}
            {gameActive && (
              <div
                onClick={handleTargetHit}
                className="absolute transition-all duration-200 ease-out cursor-crosshair"
                style={{
                  left: gameState.targetPos.x,
                  top: gameState.targetPos.y,
                  width: gameState.targetSize,
                  height: gameState.targetSize,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div
                  className="w-full h-full rounded-full border-4 border-cyan-400 animate-pulse hover:scale-110 transition-transform"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, #00ffff, #00cccc, #008888)`,
                    boxShadow: `0 0 ${gameState.targetSize}px #00ffff88, inset 0 0 ${gameState.targetSize/2}px #00ffff44`,
                  }}
                />
              </div>
            )}

            {/* Particle Effects */}
            {particles.map((particle) => (
              <div
                key={particle.id}
                className="absolute w-2 h-2 bg-cyan-400 rounded-full animate-ping"
                style={{
                  left: particle.x,
                  top: particle.y,
                }}
              />
            ))}

            {/* Game Over Overlay */}
            {!gameActive && gameStarted && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-xl">
                <div className="text-center">
                  <h3 className="text-3xl font-bold text-cyan-400 mb-2">MISSION COMPLETE</h3>
                  <p className="text-xl text-white mb-4">Final Score: {gameState.score}</p>
                  <div className="text-sm text-gray-300">
                    <p>Targets Hit: {Math.floor(gameState.score / 10)}</p>
                    <p>Max Combo: {gameState.combo}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Flag Display */}
        {flag && (
          <div className="mb-8 max-w-2xl w-full p-6 border-2 border-green-500 rounded-xl bg-green-900/20 text-center shadow-2xl shadow-green-500/30">
            <h2 className="text-2xl font-bold text-green-400 mb-3">🚩 FLAG CAPTURED 🚩</h2>
            <code className="text-lg text-green-300 break-words font-bold">{flag}</code>
          </div>
        )}

        {/* Token Input Section */}
        {showTokenInput && (
          <div className="mb-8 max-w-2xl w-full">
            <div className="bg-black/50 border border-cyan-500/50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-cyan-400 mb-3">🔐 Security Token Override</h3>
              <p className="text-gray-300 mb-4">
                High scores require cryptographic verification. Submit your security token to authenticate your score.
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Paste security token here..."
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  className="flex-1 p-3 rounded-lg border border-cyan-500 bg-black/50 text-cyan-400 placeholder:text-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
                <button
                  onClick={handleTokenSubmit}
                  className="px-6 py-3 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 transition-all"
                >
                  SUBMIT
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages & Hints */}
        {(message || hint) && (
          <div className="mb-8 max-w-2xl w-full space-y-4">
            {message && (
              <div className={`p-4 rounded-lg border ${
                flag ? "border-green-500 bg-green-900/20 text-green-300" : 
                message.includes("❌") ? "border-red-500 bg-red-900/20 text-red-300" :
                "border-yellow-500 bg-yellow-900/20 text-yellow-300"
              }`}>
                <p className="font-semibold">{message}</p>
              </div>
            )}
            {hint && (
              <div className="p-4 rounded-lg border border-purple-500 bg-purple-900/20 text-purple-300">
                <p className="text-sm"><span className="font-bold">💡 Hint:</span> {hint}</p>
              </div>
            )}
          </div>
        )}

        {/* Leaderboard */}
        <section className="max-w-2xl w-full">
          <h2 className="text-3xl font-bold text-cyan-400 mb-6 text-center">🏆 HALL OF FAME</h2>
          <div className="bg-black/50 border border-cyan-500/50 rounded-xl p-6">
            {leaderboard.length > 0 ? (
              <ul className="space-y-3">
                {leaderboard.map((entry, i) => (
                  <li
                    key={i}
                    className={`flex justify-between items-center p-3 rounded-lg transition-all ${
                      i === 0 ? "bg-yellow-500/20 border border-yellow-500/50" :
                      i === 1 ? "bg-gray-400/20 border border-gray-400/50" :
                      i === 2 ? "bg-orange-500/20 border border-orange-500/50" :
                      "bg-cyan-500/10 border border-cyan-500/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                      </span>
                      <span className="font-bold text-lg">{entry.user}</span>
                    </div>
                    <span className="text-xl font-bold text-cyan-400">{entry.score}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-400">No scores yet. Be the first!</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
