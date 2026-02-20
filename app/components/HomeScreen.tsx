"use client";

import { useEffect, useMemo, useState } from "react";
import { trackEvent } from "../lib/gtag";

type CharId = "green" | "berry" | "sprinkle";
type GameMode = "free" | "mission" | "timeAttack";

type CharacterOption = {
  id: CharId;
  label: string;
  flavor: string;
  accent: string;
};

type ModeOption = {
  id: GameMode;
  label: string;
  detail: string;
};

const CHARACTERS: CharacterOption[] = [
  { id: "green", label: "Pistachio", flavor: "Smooth and steady", accent: "var(--yl-green)" },
  { id: "berry", label: "Berry Burst", flavor: "Fast and lively", accent: "var(--yl-berry)" },
  { id: "sprinkle", label: "Sprinkle Pop", flavor: "Playful and bright", accent: "var(--yl-yellow)" },
];

const MODES: ModeOption[] = [
  { id: "free", label: "Free Play", detail: "Catch as many as you can." },
  { id: "mission", label: "Mission", detail: "Catch only target toppings." },
  { id: "timeAttack", label: "Time Attack", detail: "30 seconds to set your best." },
];

export default function HomeScreen({
  nickname,
  bestScore,
  stores,
  selectedStore,
  onStoreChange,
  onStart,
  onOpenLeaderboard,
}: {
  nickname?: string;
  bestScore: number;
  stores: string[];
  selectedStore: string;
  onStoreChange: (store: string) => void;
  onStart: (character: CharId, mode: GameMode) => void;
  onOpenLeaderboard: () => void;
}) {
  const [character, setCharacter] = useState<CharId>("green");
  const [mode, setMode] = useState<GameMode>("free");

  useEffect(() => {
    const savedChar = localStorage.getItem("selectedCharacter") as CharId | null;
    const savedMode = localStorage.getItem("selectedMode") as GameMode | null;

    if (savedChar && CHARACTERS.some((c) => c.id === savedChar)) setCharacter(savedChar);
    if (savedMode && MODES.some((m) => m.id === savedMode)) setMode(savedMode);
  }, []);

  const selectedCharacter = useMemo(
    () => CHARACTERS.find((c) => c.id === character) ?? CHARACTERS[0],
    [character]
  );

  const startGame = () => {
    localStorage.setItem("selectedCharacter", character);
    localStorage.setItem("selectedMode", mode);

    trackEvent({
      action: "home_start_click",
      category: "engagement",
      label: `${character}_${mode}`,
    });

    onStart(character, mode);
  };

  return (
    <main className="relative h-full overflow-hidden bg-[radial-gradient(circle_at_12%_8%,#ffffff_0%,#ffedf7_36%,#f9d3e7_100%)] p-5">
      <div className="pointer-events-none absolute -right-14 -top-14 h-56 w-56 rounded-full bg-white/70 blur-2xl" />
      <div className="pointer-events-none absolute -left-14 bottom-10 h-44 w-44 rounded-full bg-[#9ee86b]/30 blur-2xl" />

      <div className="relative z-10 mx-auto flex h-full max-w-sm flex-col">
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white shadow-[0_10px_24px_rgba(150,9,83,0.24)]">
              <span className="text-xl">🍦</span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#960953]">Yogurtland</p>
              <h1 className="text-xl font-black text-[#4b0b31]">Ice Cream Catcher</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="rounded-full border border-[#f2bad5] bg-white px-3 py-2 text-xs font-black text-[#960953] shadow-sm transition hover:-translate-y-0.5"
          >
            Leaderboard
          </button>
        </header>

        {nickname ? (
          <p className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-[#7d3f61]">
            Logged in as <span className="text-[#960953]">{nickname}</span>
          </p>
        ) : null}

        <section className="mb-4 rounded-3xl border border-[#f8d2e4] bg-white/85 p-5 shadow-[0_16px_40px_rgba(150,9,83,0.16)] backdrop-blur-sm">
          <h2 className="mt-1 text-3xl font-black leading-[1.08] text-[#4b0b31]">Catch. Score. Celebrate.</h2>
          <p className="mt-2 text-sm font-semibold text-[#72425f]">
            Inspired by Yogurtland&apos;s bright store look and promo energy.
          </p>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#fff3f9] px-4 py-3 ring-1 ring-[#f5c7de]">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#960953]">Best Score</p>
              <p className="text-2xl font-black text-[#4b0b31]">{bestScore}</p>
            </div>
            <span className="rounded-full bg-[#8dc63f] px-3 py-1 text-xs font-black text-white">Play Boost</span>
          </div>
        </section>

        <section className="mb-3">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[#960953]">Pick your cup</p>
          <div className="grid grid-cols-3 gap-2">
            {CHARACTERS.map((c) => {
              const active = c.id === character;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCharacter(c.id)}
                  className={`rounded-2xl border bg-white px-2 py-2 text-center transition ${
                    active
                      ? "-translate-y-0.5 border-[#79d854] shadow-[0_10px_24px_rgba(72,175,53,0.24)]"
                      : "border-white/70 hover:-translate-y-0.5"
                  }`}
                >
                  <div
                    className="mx-auto mb-1 grid h-11 w-11 place-items-center rounded-2xl"
                    style={{ background: `${c.accent}22` }}
                  >
                    <img src={`/${c.id}.png`} alt={c.label} className="h-10 w-10 select-none" draggable={false} />
                  </div>
                  <p className="text-[11px] font-black text-[#4f1736]">{c.label}</p>
                  <p className="text-[10px] font-bold text-[#8c5c77]">{c.flavor}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mb-3 rounded-2xl border border-[#f8d2e4] bg-white/80 p-3">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[#960953]">Store</p>
          <select
            value={selectedStore}
            onChange={(e) => onStoreChange(e.target.value)}
            className="mb-3 w-full rounded-xl border border-[#f3bdd8] bg-[#fff9fc] px-3 py-2 text-sm font-semibold text-[#4b0f31] outline-none focus:border-[#960953]"
          >
            {stores.map((store) => (
              <option key={store} value={store}>
                {store}
              </option>
            ))}
          </select>

          <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[#960953]">Game mode</p>
          <div className="space-y-2">
            {MODES.map((m) => {
              const active = m.id === mode;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`w-full rounded-xl px-3 py-2 text-left transition ${
                    active
                      ? "bg-[#960953] text-white shadow-[0_8px_16px_rgba(150,9,83,0.32)]"
                      : "bg-[#fff2f8] text-[#5a2343] hover:bg-[#fee8f4]"
                  }`}
                >
                  <p className="text-sm font-black">{m.label}</p>
                  <p className={`text-xs font-semibold ${active ? "text-white/90" : "text-[#8a5b76]"}`}>{m.detail}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-auto rounded-2xl border border-[#f8d2e4] bg-white/85 p-3 shadow-[0_8px_22px_rgba(150,9,83,0.14)]">
          <button
            type="button"
            onClick={startGame}
            className="mt-3 w-full rounded-xl bg-[linear-gradient(135deg,#960953,#c54b86)] px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_14px_24px_rgba(150,9,83,0.35)] transition hover:-translate-y-0.5"
          >
            Start Game
          </button>
          <p className="mt-2 text-center text-[11px] font-bold text-[#8d5b76]">
            Selected: {selectedCharacter.label} · {MODES.find((m) => m.id === mode)?.label}
          </p>
        </section>
      </div>
    </main>
  );
}
