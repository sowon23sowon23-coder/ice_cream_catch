"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Game from "../components/Game";

type Props = {
  entryId: number;
  entryCode: string;
};

export default function GameClient({ entryId, entryCode }: Props) {
  const router = useRouter();
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [character, setCharacter] = useState<"green" | "berry" | "sprinkle">("green");
  const [mode, setMode] = useState<"free" | "mission" | "timeAttack">("free");
  const [startSignal, setStartSignal] = useState(1);

  const postScore = async (score: number) => {
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score }),
      });

      if (!res.ok) {
        setSaveNotice("Score save failed. Please retry.");
        return;
      }
      setSaveNotice("Best score updated.");
    } catch {
      setSaveNotice("Score save failed. Please retry.");
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_15%_5%,#ffffff_0%,#ffeef8_35%,#f8d5e8_100%)] p-2 sm:p-4">
      <div className="mx-auto mb-2 flex w-full max-w-[430px] items-center justify-between rounded-2xl border border-[var(--yl-card-border)] bg-white/95 px-3 py-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--yl-primary)]">Entry</p>
          <p className="text-sm font-black text-[var(--yl-ink-strong)]">{entryCode}</p>
          <p className="text-[10px] font-semibold text-[var(--yl-ink-muted)]">ID {entryId}</p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMode("free")}
            className={`rounded-lg px-2 py-1 text-xs font-black ${
              mode === "free" ? "bg-[var(--yl-primary)] text-white" : "bg-[var(--yl-card-bg)] text-[var(--yl-primary)]"
            }`}
          >
            Free
          </button>
          <button
            type="button"
            onClick={() => setMode("mission")}
            className={`rounded-lg px-2 py-1 text-xs font-black ${
              mode === "mission"
                ? "bg-[var(--yl-primary)] text-white"
                : "bg-[var(--yl-card-bg)] text-[var(--yl-primary)]"
            }`}
          >
            Mission
          </button>
          <button
            type="button"
            onClick={() => setMode("timeAttack")}
            className={`rounded-lg px-2 py-1 text-xs font-black ${
              mode === "timeAttack"
                ? "bg-[var(--yl-primary)] text-white"
                : "bg-[var(--yl-card-bg)] text-[var(--yl-primary)]"
            }`}
          >
            Time
          </button>
        </div>
      </div>

      {saveNotice && (
        <div className="mx-auto mb-2 w-full max-w-[430px] rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
          {saveNotice}
        </div>
      )}

      <Game
        character={character}
        mode={mode}
        startSignal={startSignal}
        onExitToHome={() => router.push("/entry")}
        onBestScore={() => {}}
        onRoundEnd={async (finalScore) => {
          await postScore(finalScore);
        }}
      />

      <div className="mx-auto mt-2 flex w-full max-w-[430px] items-center justify-between rounded-2xl border border-[var(--yl-card-border)] bg-white/95 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--yl-ink-muted)]">Character</span>
          {(["green", "berry", "sprinkle"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setCharacter(id)}
              className={`rounded-lg px-2 py-1 text-xs font-black ${
                character === id ? "bg-[var(--yl-primary)] text-white" : "bg-[var(--yl-card-bg)] text-[var(--yl-primary)]"
              }`}
            >
              {id}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setStartSignal((v) => v + 1)}
          className="rounded-lg bg-[var(--yl-primary)] px-3 py-1.5 text-xs font-black text-white"
        >
          Restart
        </button>
      </div>
    </main>
  );
}
