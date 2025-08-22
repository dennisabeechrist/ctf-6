import { NextRequest } from "next/server";

const ADMIN = { user: "Admin", score: 25 };
const MAX_SCORE = 100; // realistic max clicks

// For demo brevity, store leaderboard in-memory.
let leaderboard = [ADMIN];

// For demo: simple HMAC-like signature with secret key (mock)
const secretKey = "super_secret_key_ctf";

// Simple signature generation (simulate HMAC)
function signScore(name: string, score: number) {
  const raw = `${name}:${score}:${secretKey}`;
  // Simple hash substitute: sum char codes modulo
  let hash = 0;
  for (const c of raw) hash = (hash + c.charCodeAt(0)) % 65536;
  return hash.toString(16);
}

function verifyToken(name: string, score: number, token: string) {
  return token === signScore(name, score);
}

function addScore(user: string, score: number) {
  leaderboard = leaderboard.filter((e) => e.user.toLowerCase() !== user.toLowerCase());
  leaderboard.push({ user, score });
  leaderboard = leaderboard.sort((a, b) => b.score - a.score).slice(0, 10);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const name = url.searchParams.get("name") || "";
  const scoreStr = url.searchParams.get("score") || "";
  const token = url.searchParams.get("token") || "";

  let message = "Beat Admin to get the flag!";
  let flag = undefined;

  const score = Number(scoreStr);

  if (!name) {
    message = "Player name is required.";
  } else if (!Number.isInteger(score) || score < 0) {
    message = "Invalid score.";
  } else if (score > MAX_SCORE) {
    message = "Score too high, cheating suspected.";
  } else {
    // Require a valid or empty token
    if (token.length > 0) {
      if (!verifyToken(name, score, token)) {
        message = "Invalid score token.";
      } else {
        addScore(name, score);
        if (score > ADMIN.score) {
          flag = "CTF{token_power_unlocks_flag}";
          message = "Congrats! You submitted a valid score token and got the flag!";
        } else {
          message = "Score accepted with valid token.";
        }
      }
    } else {
      // No token case: accept score if below admin score (to encourage manual token)
      if (score > ADMIN.score) {
        message = "Score too high, supply a valid score token to get the flag.";
      } else {
        addScore(name, score);
        message = "Good score! Keep trying to beat Admin.";
      }
    }
  }

  return new Response(
    JSON.stringify({
      leaderboard,
      message,
      flag,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
