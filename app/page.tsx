"use client";

import { useEffect, useState } from "react";

type Entry = { user: string; score: number };
type ApiResp = {
  leaderboard: Entry[];
  message?: string;
  flag?: string;
  note?: string;
};

export default function Home() {
  const [name, setName] = useState("");
  const [score, setScore] = useState<number | "">("");
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchScores(query?: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/scores${query || ""}`, { cache: "no-store" });
      const json = (await res.json()) as ApiResp;
      setData(json);
    } catch (e) {
      console.error(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchScores();
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (name) params.set("name", name);
    if (score !== "") params.set("score", String(score));
    const q = params.toString() ? `?${params.toString()}` : "";
    fetchScores(q);
  }

  return (
    <main className="min-h-screen bg-black text-[#00ffcc] font-mono p-6">
      <div className="max-w-2xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl mb-2">CTF Arcade – Leaderboard</h1>
          <p className="text-sm opacity-80">
            Beat <strong>Admin</strong> (9999) to win the flag.
          </p>
        </header>

        <section className="mb-6 border border-[#00ffcc] rounded-xl p-4">
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col">
              <span className="text-sm opacity-80 mb-1">Name</span>
              <input
                className="bg-black border border-[#00ffcc] rounded-lg p-2 outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="your_name"
                required
              />
            </label>
            <label className="flex flex-col">
              <span className="text-sm opacity-80 mb-1">Score</span>
              <input
                className="bg-black border border-[#00ffcc] rounded-lg p-2 outline-none"
                value={score}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") setScore("");
                  else setScore(Number(v));
                }}
                placeholder="e.g., 10000"
                inputMode="numeric"
                pattern="[0-9]*"
                required
              />
            </label>
            <button
              type="submit"
              className="mt-2 border border-[#00ffcc] rounded-xl px-4 py-2 hover:opacity-80"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit Score"}
            </button>
          </form>
        </section>

        <section className="border border-[#00ffcc] rounded-xl p-4">
          <h2 className="text-xl mb-3">Leaderboard</h2>
          {!data && <p>Loading…</p>}
          {data && (
            <>
              <ul className="space-y-2">
                {data.leaderboard.map((e, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{i + 1}. {e.user}</span>
                    <span>{e.score}</span>
                  </li>
                ))}
              </ul>
              {data.message && <p className="mt-4 text-sm opacity-80">{data.message}</p>}
              {data.flag && (
                <div className="mt-4 p-3 border border-[#00ffcc] rounded-lg">
                  <p className="mb-1">🎉 <strong>FLAG</strong></p>
                  <code className="break-words">{data.flag}</code>
                  {data.note && <p className="mt-2 text-xs opacity-70">{data.note}</p>}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
