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
    <main className="min-h-screen bg-gradient-to-b from-pink-100 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-white/70 backdrop-blur-xl shadow-xl p-6">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🍨</div>
          <h1 className="text-2xl font-black text-pink-600">Ice Cream Catcher</h1>
          <div className="mt-1 text-sm text-slate-600">
            Best Score: <span className="font-extrabold text-pink-600">{bestScore}</span>
          </div>
        </div>

        <div className="mb-5">
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Nickname (2-12 characters)"
            maxLength={12}
            className="w-full px-4 py-3 rounded-2xl bg-white border border-black/10 font-bold outline-none focus:ring-2 focus:ring-pink-300"
          />
          <div className="mt-2 text-xs text-slate-500">This name will be displayed on the leaderboard.</div>
        </div>

        <div className="mb-6">
          <div className="text-sm font-extrabold text-slate-700 mb-3 text-center">Choose your character</div>
          <div className="flex justify-center gap-4">
            {(["green", "berry", "sprinkle"] as CharId[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedChar(c)}
                className={`rounded-2xl p-2 transition active:scale-95 ${
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

        <div className="mb-2">
          <div className="text-sm font-extrabold text-slate-700 mb-3 text-center">Select Game Mode</div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleStart}
              className="w-full py-4 rounded-full bg-pink-500 text-white font-extrabold shadow-lg active:scale-95 transition"
            >
              Free Play
            </button>
            <button
              type="button"
              onClick={handleComingSoon}
              className="w-full py-3 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300 active:scale-95 transition"
            >
              Topping Mission
            </button>
            <button
              type="button"
              onClick={handleComingSoon}
              className="w-full py-3 rounded-full bg-sky-100 text-sky-900 font-bold border border-sky-300 active:scale-95 transition"
            >
              Custom Topping (Time Attack)
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenLeaderboard}
          className="w-full mt-3 py-3 rounded-full bg-slate-100 text-slate-700 font-bold border border-black/5 active:scale-95"
        >
          🏆 View Leaderboard
        </button>
      </div>
    </main>
  );
}
