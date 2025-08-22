import { NextRequest } from "next/server";

// Realistic high admin score for challenge
const ADMIN = { user: "Admin", score: 30 };
const MAX_SCORE = 100;

let leaderboard = [ADMIN];

// Secret key for token signing (naive)
const SECRET_KEY = "hard_ctf_secret_key_2025";

// Simple naive signature generator (string sum + secret)
function sign(name: string, score: number): string {
  const raw = `${name}:${score}:${SECRET_KEY}`;
  let sum = 0;
  for (let i = 0; i < raw.length; i++) sum += raw.charCodeAt(i);
  return sum.toString(16);
}

function verify(name: string, score: number, token: string): boolean {
  return token === sign(name, score);
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
    if (score > ADMIN.score) {
      if (token.length === 0) {
        message = "High score detected! Provide a valid score token!";
      } else if (verify(name, score, token)) {
        addScore(name, score);
        flag = "CTF{cryptographically_challenging_score_token}";
        message = "Congrats! Valid token submitted, you got the flag!";
      } else {
        message = "Invalid score token!";
      }
    } else {
      addScore(name, score);
      message = "Score accepted! Try to beat Admin for the flag.";
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
