import { NextRequest } from "next/server";

const ADMIN = { user: "Admin", score: 20 };

let leaderboard = [ADMIN];

function addScore(user: string, score: number) {
  leaderboard = leaderboard.filter(e => e.user.toLowerCase() !== user.toLowerCase());
  leaderboard.push({ user, score });
  leaderboard = leaderboard.sort((a, b) => b.score - a.score).slice(0, 10);
}

function isCheating(score: number) {
  // Set max possible clicks per 30s to something reasonable
  return score > 50;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const name = url.searchParams.get("name");
  const scoreStr = url.searchParams.get("score");

  let message = "Beat Admin to get the flag!";
  let flag = undefined;

  if (name && scoreStr) {
    const score = Number(scoreStr);
    if (!Number.isFinite(score) || score < 0) {
      message = "Invalid score.";
    } else if (isCheating(score)) {
      message = "Cheating detected! Score too high.";
    } else {
      addScore(name, score);
      if (score > ADMIN.score && name.toLowerCase() === "admin") {
        flag = "CTF{arcade_master_skill}";
        message = "Congrats! You beat Admin and earned the flag!";
      } else if (score > ADMIN.score) {
        message = "Nice! You beat Admin's score. Try playing as Admin to get the flag!";
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
