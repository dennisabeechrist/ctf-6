import { NextRequest, NextResponse } from "next/server";

// Admin defaults
const ADMIN_NAME = "Admin";
const ADMIN_SCORE = 9999;

// Read flag from environment variable (set in Vercel)
const FLAG = process.env.FLAG || "hackpulse{arcade_master_default}";

// Helper: parse score safely
function parseScore(score: string | null): number | null {
  if (!score) return null;
  const n = Number(score);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const nameParam = url.searchParams.get("name");
  const scoreParam = url.searchParams.get("score");

  const submittedScore = parseScore(scoreParam);
  const submittedName = nameParam?.slice(0, 24) || null;

  // Base leaderboard (in-memory array)
  const leaderboard: Array<{ user: string; score: number }> = [
    { user: ADMIN_NAME, score: ADMIN_SCORE },
    { user: "Player1", score: 500 },
    { user: "Player2", score: 300 }
  ];

  // Vulnerable: blindly add user-submitted score
  if (submittedName && submittedScore !== null) {
    leaderboard.push({ user: submittedName, score: submittedScore });
  }

  // Sort descending
  leaderboard.sort((a, b) => b.score - a.score);

  const top = leaderboard[0];
  const isWinner = top.user !== ADMIN_NAME && top.score > ADMIN_SCORE;

  const responseBody: Record<string, unknown> = {
    leaderboard,
    message:
      "Submit your name & score as query params (e.g., /api/scores?name=you&score=10000). Beat Admin to win!"
  };

  if (isWinner) {
    responseBody.flag = FLAG;
    responseBody.note =
      "Congrats! Your score tops the leaderboard. (This endpoint trusts client input deliberately.)";
  }

  return NextResponse.json(responseBody);
}
