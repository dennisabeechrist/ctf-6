// In your /app/api/scores/route.ts (for Next.js API route)
import { NextRequest } from "next/server";

const ADMIN = { user: "Admin", score: 9999 };

// Store leaderboard in memory for demo; replace with DB for persistence.
let leaderboard = [ADMIN];

function addScore(name: string, score: number) {
  leaderboard = leaderboard.filter(e => e.user !== name); // Remove duplicate by name
  leaderboard.push({ user: name, score });
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 10);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const name = url.searchParams.get("name");
  const scoreStr = url.searchParams.get("score");
  const magic = url.searchParams.get("magic"); // Our hidden challenge param

  let message = "Beat Admin to get the flag!";
  let flag = undefined;
  let note = undefined;

  // Allow score manipulation for fun, but need 'magic' for flag
  if (name && scoreStr) {
    const score = Number(scoreStr);
    if (!Number.isFinite(score) || score < 0) {
      message = "Invalid score.";
    } else {
      addScore(name, score);

      if (score > ADMIN.score && magic === "ctf2025") {
        flag = "CTF{score_manipulation_master}";
        note =
          "You found the secret! The flag is only awarded if you submit a very high score AND the hidden query param 'magic=ctf2025'.";
        message = "Congrats, you beat Admin and found the twist!";
      } else if (score > ADMIN.score) {
        note =
          "You beat Admin, but something is missing…";
        message = "Keep looking for a secret parameter or special trick!";
      }
    }
  }

  return Response.json({
    leaderboard,
    message,
    flag,
    note,
  });
}
