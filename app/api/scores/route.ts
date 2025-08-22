import { NextRequest } from "next/server";

interface Entry {
  user: string;
  score: number;
  timestamp: number;
}

// Admin with challenging but achievable score
const ADMIN_ENTRY: Entry = { user: "Admin", score: 150, timestamp: Date.now() };
const MAX_REALISTIC_SCORE = 500;
const MIN_FLAG_SCORE = 151;

// In-memory leaderboard (use database in production)
let leaderboard: Entry[] = [ADMIN_ENTRY];

// Cryptographic secret for token generation
const SECRET_KEY = "ctf_arcade_2025_secret";
const SALT = "precision_striker";

// Enhanced token generation with multiple components
function generateToken(name: string, score: number, timestamp: number): string {
  const payload = `${name.toLowerCase()}:${score}:${timestamp}:${SALT}`;
  
  // Simple but effective hash function for demo
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Additional obfuscation
  const secretHash = SECRET_KEY.split('').reduce((acc, char, i) => {
    return acc + char.charCodeAt(0) * (i + 1);
  }, 0);
  
  const finalHash = Math.abs(hash ^ secretHash);
  return finalHash.toString(16).padStart(8, '0');
}

function verifyToken(name: string, score: number, token: string): boolean {
  // Allow some timestamp flexibility (within 1 hour)
  const now = Date.now();
  const hourAgo = now - (60 * 60 * 1000);
  
  for (let timestamp = now; timestamp >= hourAgo; timestamp -= 1000) {
    const validToken = generateToken(name, score, timestamp);
    if (validToken === token.toLowerCase()) {
      return true;
    }
  }
  return false;
}

function addToLeaderboard(entry: Entry) {
  // Remove existing entry for same user
  leaderboard = leaderboard.filter(e => 
    e.user.toLowerCase() !== entry.user.toLowerCase()
  );
  
  // Add new entry
  leaderboard.push(entry);
  
  // Sort by score (descending) and keep top 10
  leaderboard = leaderboard
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const name = url.searchParams.get("name")?.trim() || "";
  const scoreStr = url.searchParams.get("score")?.trim() || "";
  const token = url.searchParams.get("token")?.trim() || "";

  let message = "🎯 Beat Admin's score to get the flag!";
  let flag: string | undefined;
  let hint: string | undefined;

  // If no parameters, just return leaderboard
  if (!name || !scoreStr) {
    return Response.json({
      leaderboard,
      message: "🎮 Welcome to CTF Arcade! Start playing to submit your score.",
      hint: "🔍 High scores need special authentication. Inspect the game mechanics carefully..."
    });
  }

  const score = parseInt(scoreStr, 10);

  // Validation
  if (!name) {
    message = "❌ Player name is required!";
  } else if (!Number.isInteger(score) || score < 0) {
    message = "❌ Invalid score format!";
  } else if (score > MAX_REALISTIC_SCORE) {
    message = "❌ Score too high! Maximum realistic score is " + MAX_REALISTIC_SCORE;
    hint = "🤔 Maybe there's another way to submit scores...";
  } else {
    const timestamp = Date.now();
    const entry: Entry = { user: name, score, timestamp };

    if (score >= MIN_FLAG_SCORE) {
      // High score - requires token
      if (!token) {
        addToLeaderboard(entry);
        message = "🔒 High score detected! Security token required for flag.";
        hint = `💡 Generate a valid token: MD5-like hash of "${name.toLowerCase()}:${score}:timestamp:precision_striker" with secret key. Inspect the source!`;
      } else if (verifyToken(name, score, token)) {
        addToLeaderboard(entry);
        flag = "CTF{token_master_arcade_champion_2025}";
        message = "🎉 CONGRATULATIONS! Valid token verified - FLAG ACQUIRED!";
      } else {
        message = "❌ Invalid security token!";
        hint = "🔐 Token verification failed. Check the generation algorithm and timestamp.";
      }
    } else {
      // Normal score - no token needed
      addToLeaderboard(entry);
      if (score > ADMIN_ENTRY.score / 2) {
        message = `✅ Great score! You're getting close to Admin's ${ADMIN_ENTRY.score}.`;
        hint = "🎯 Keep practicing! Higher scores unlock special features...";
      } else {
        message = "✅ Score recorded! Keep practicing to beat Admin.";
      }
    }
  }

  return Response.json({
    leaderboard,
    message,
    flag,
    hint,
  });
}
