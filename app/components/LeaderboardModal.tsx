"use client";

import { useEffect } from "react";

type CharId = "green" | "berry" | "sprinkle";

export type LeaderRow = {
  rank: number;
  nickname: string;
  score: number;
  date?: string;
  character?: CharId;
};

export type LeaderMode = "today" | "all";

function characterLabel(character?: CharId) {
  if (character === "green") return "Green";
  if (character === "berry") return "Berry";
  if (character === "sprinkle") return "Sprinkle";
  return "-";
}

export default function LeaderboardModal({
  open,
  onClose,
  rows,
  loading = false,
  myNickname,
  myScore,
  myRank,
  mode,
  onModeChange,
}: {
  open: boolean;
  onClose: () => void;
  rows: LeaderRow[];
  loading?: boolean;
  myNickname?: string;
  myScore?: number;
  myRank?: number;
  mode: LeaderMode;
  onModeChange: (m: LeaderMode) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const inTop20 = myRank !== undefined ? myRank <= 20 : false;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/35" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-3xl bg-white/80 backdrop-blur-xl shadow-2xl border border-black/5 overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-extrabold tracking-widest text-pink-500/80">TOP 20</div>
            <div className="text-xl font-black text-slate-800">Leaderboard</div>
          </div>

          <button
            onClick={onClose}
            className="h-10 w-10 rounded-2xl bg-white shadow border border-black/5 active:scale-95"
            aria-label="close"
            type="button"
          >
            X
          </button>
        </div>

        <div className="px-5 -mt-1 mb-3">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/70 border border-black/5 p-1">
            <button
              type="button"
              onClick={() => onModeChange("today")}
              className={`py-2 rounded-xl font-extrabold text-sm ${
                mode === "today" ? "bg-pink-500 text-white shadow" : "text-slate-700"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => onModeChange("all")}
              className={`py-2 rounded-xl font-extrabold text-sm ${
                mode === "all" ? "bg-pink-500 text-white shadow" : "text-slate-700"
              }`}
            >
              All-time
            </button>
          </div>
        </div>

        <div className="px-5 pb-5">
          {(myNickname || myScore !== undefined) && (
            <div className="mb-3 rounded-2xl bg-pink-50 border border-pink-100 px-4 py-3">
              <div className="text-xs font-bold text-pink-600/80">Your best (saved)</div>

              <div className="mt-1 flex items-center justify-between">
                <div className="font-extrabold text-slate-800">{myNickname ?? "-"}</div>
                <div className="font-black text-pink-600 text-lg">{myScore ?? "-"}</div>
              </div>

              {myRank !== undefined && (
                <div className="mt-2 text-xs font-bold text-slate-700">
                  Your Rank: <span className="text-pink-600 font-black">#{myRank}</span>{" "}
                  {!inTop20 && <span className="text-slate-500 font-semibold">(outside Top 20)</span>}
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl bg-white border border-black/5 overflow-hidden">
            <div className="grid grid-cols-[52px_1fr_70px_84px] px-4 py-3 text-xs font-extrabold text-slate-500 bg-slate-50">
              <div>RANK</div>
              <div>NICK</div>
              <div>CHAR</div>
              <div className="text-right">SCORE</div>
            </div>

            {loading ? (
              <div className="px-4 py-6 text-sm text-slate-500">Loading...</div>
            ) : rows.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500">No scores yet.</div>
            ) : (
              <div className="max-h-[360px] overflow-auto">
                {rows.map((r) => {
                  const isMe =
                    myNickname &&
                    r.nickname.trim().toLowerCase() === myNickname.trim().toLowerCase();

                  return (
                    <div
                      key={`${r.rank}-${r.nickname}-${r.score}`}
                      className={`grid grid-cols-[52px_1fr_70px_84px] px-4 py-3 border-t border-black/5 text-sm ${
                        isMe ? "bg-pink-50" : ""
                      }`}
                    >
                      <div className="font-black text-slate-700">{r.rank}</div>
                      <div className="font-bold text-slate-800 truncate">
                        {r.nickname}
                        {isMe ? <span className="ml-2 text-xs font-black text-pink-600">YOU</span> : null}
                        {r.date ? (
                          <span className="ml-2 text-xs text-slate-400 font-semibold">{r.date}</span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                        {r.character ? (
                          <img
                            src={`/${r.character}.png`}
                            alt={r.character}
                            className="h-5 w-5 rounded-full bg-white/60"
                            draggable={false}
                          />
                        ) : null}
                        <span className="truncate">{characterLabel(r.character)}</span>
                      </div>
                      <div className="text-right font-black text-slate-900">{r.score}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4">
            <button
              onClick={onClose}
              className="w-full rounded-2xl bg-slate-100 border border-black/5 px-4 py-3 font-extrabold active:scale-[0.99]"
              type="button"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
