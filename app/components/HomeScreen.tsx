"use client";

import { useEffect, useState } from "react";

export type CharId = "green" | "berry" | "sprinkle";

export default function HomeScreen({
  bestScore,
  onStart,
  onOpenLeaderboard,
}: {
  bestScore: number;
  onStart: (char: CharId) => void;
  onOpenLeaderboard: () => void;
}) {
  const [selectedChar, setSelectedChar] = useState<CharId>("green");
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("nickname");
    if (saved) setNickname(saved);
  }, []);

  useEffect(() => {
    if (nickname.trim()) {
      localStorage.setItem("nickname", nickname.trim());
    }
  }, [nickname]);

  const handleStart = () => {
    const nick = nickname.trim();

    if (nick.length < 2 || nick.length > 12) {
      alert("Please enter a nickname between 2 and 12 characters.");
      return;
    }

    onStart(selectedChar);
  };

  const handleComingSoon = () => {
    alert("Coming soon!");
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_10%,#ffe9f3_0%,transparent_36%),radial-gradient(circle_at_85%_18%,#dff4ff_0%,transparent_40%),linear-gradient(180deg,#fff6fb_0%,#eef8ff_54%,#e8f4ff_100%)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/80 backdrop-blur-2xl shadow-[0_16px_48px_rgba(17,24,39,0.18)] p-5 sm:p-6">
        <div className="mb-5 rounded-3xl bg-gradient-to-r from-pink-500 to-rose-400 text-white p-5 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">Arcade</p>
              <h1 className="mt-1 text-2xl font-black leading-tight">Ice Cream Catcher</h1>
            </div>
            <div className="text-3xl">🍨</div>
          </div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5">
            <span className="text-xs font-bold text-white/80">Best Score</span>
            <span className="text-sm font-black">{bestScore}</span>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-slate-200/70 bg-white/80 p-4">
          <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Nickname
          </label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Nickname (2-12 characters)"
            maxLength={12}
            className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-pink-300"
          />
          <div className="mt-2 text-xs text-slate-500">This name will be displayed on the leaderboard.</div>
        </div>

        <div className="mb-4 rounded-2xl border border-slate-200/70 bg-white/80 p-4">
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3">
            Choose Character
          </div>
          <div className="flex justify-center gap-4">
            {(["green", "berry", "sprinkle"] as CharId[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedChar(c)}
                className={`rounded-2xl p-2 transition active:scale-95 border ${
                  selectedChar === c ? "ring-4 ring-pink-400 bg-white scale-110" : "bg-white/80"
                }`}
              >
                <img
                  src={`/${c}.png`}
                  alt={c}
                  className="w-16 h-16 select-none pointer-events-none"
                  draggable={false}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="mb-2 rounded-2xl border border-slate-200/70 bg-white/80 p-4">
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3">
            Select Game Mode
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleStart}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-extrabold shadow-lg active:scale-95 transition"
            >
              Free Play
            </button>
            <button
              type="button"
              onClick={handleComingSoon}
              className="w-full py-3 rounded-2xl bg-amber-50 text-amber-900 font-bold border border-amber-200 active:scale-95 transition"
            >
              Topping Mission
            </button>
            <button
              type="button"
              onClick={handleComingSoon}
              className="w-full py-3 rounded-2xl bg-sky-50 text-sky-900 font-bold border border-sky-200 active:scale-95 transition"
            >
              Custom Topping (Time Attack)
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenLeaderboard}
          className="w-full mt-3 py-3 rounded-2xl bg-slate-900 text-white font-bold active:scale-95 transition"
        >
          🏆 View Leaderboard
        </button>
      </div>
    </main>
  );
}
