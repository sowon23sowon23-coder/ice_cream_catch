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
  stores,
  selectedStore,
  onStoreChange,
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
  stores: string[];
  selectedStore: string;
  onStoreChange: (store: string) => void;
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
      <div className="absolute inset-0 bg-[#2b0d1f]/45 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative w-full max-w-md overflow-hidden rounded-[1.7rem] border border-[#f2bfd9] bg-white shadow-[0_24px_50px_rgba(150,9,83,0.28)]">
        <div className="bg-[linear-gradient(135deg,#fff1f8,#f8c8df)] px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#960953]">Top 20</p>
              <h2 className="text-2xl font-black text-[#4b0b31]">Leaderboard</h2>
            </div>
            <button
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-2xl border border-[#efb8d4] bg-white text-[#7e164b] shadow-sm"
              aria-label="close"
              type="button"
            >
              X
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-white p-1 ring-1 ring-[#f4c5dd]">
            <button
              type="button"
              onClick={() => onModeChange("today")}
              className={`rounded-lg py-2 text-sm font-black transition ${
                mode === "today" ? "bg-[#960953] text-white" : "text-[#6f3254]"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => onModeChange("all")}
              className={`rounded-lg py-2 text-sm font-black transition ${
                mode === "all" ? "bg-[#960953] text-white" : "text-[#6f3254]"
              }`}
            >
              All-time
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => onStoreChange("__ALL__")}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-black transition ${
                selectedStore === "__ALL__"
                  ? "bg-[#960953] text-white"
                  : "border border-[#efb8d4] bg-white text-[#6f3254]"
              }`}
            >
              All Stores
            </button>
            <select
              value={selectedStore === "__ALL__" ? "" : selectedStore}
              onChange={(e) => onStoreChange(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-[#efb8d4] bg-white px-3 py-2 text-sm font-semibold text-[#6f3254] outline-none"
            >
              <option value="" disabled>
                Select a store…
              </option>
              {stores.map((store) => (
                <option key={store} value={store}>
                  {store}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="px-5 pb-5 pt-4">
          {(myNickname || myScore !== undefined) && (
            <div className="mb-3 rounded-2xl border border-[#f2c2da] bg-[#fff4fa] px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#960953]">
                {mode === "today" ? "Today best" : "Your best"}
              </p>
              <div className="mt-1 flex items-center justify-between">
                <div className="truncate pr-3 font-black text-[#4b0f31]">{myNickname ?? "-"}</div>
                <div className="text-lg font-black text-[#960953]">{myScore ?? "-"}</div>
              </div>
              {myRank !== undefined && (
                <p className="mt-2 text-xs font-bold text-[#6f3254]">
                  Your Rank: <span className="font-black text-[#8dc63f]">#{myRank}</span>{" "}
                  {!inTop20 && <span className="text-[#a57a92]">(outside Top 20)</span>}
                </p>
              )}
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-[#f3c7dd]">
            <div className="grid grid-cols-[52px_1fr_70px_84px] bg-[#fff2f8] px-4 py-3 text-xs font-black text-[#8a5a75]">
              <div>RANK</div>
              <div>NICK</div>
              <div>CHAR</div>
              <div className="text-right">SCORE</div>
            </div>

            {loading ? (
              <div className="px-4 py-6 text-sm font-semibold text-[#8b6178]">Loading...</div>
            ) : rows.length === 0 ? (
              <div className="px-4 py-6 text-sm font-semibold text-[#8b6178]">No scores yet.</div>
            ) : (
              <div className="max-h-[360px] overflow-auto bg-white">
                {rows.map((r) => {
                  const isMe =
                    myNickname && r.nickname.trim().toLowerCase() === myNickname.trim().toLowerCase();

                  return (
                    <div
                      key={`${r.rank}-${r.nickname}-${r.score}`}
                      className={`grid grid-cols-[52px_1fr_70px_84px] border-t border-[#f9d7e8] px-4 py-3 text-sm ${
                        isMe ? "bg-[#fff1f8]" : ""
                      }`}
                    >
                      <div className="font-black text-[#6b1f49]">{r.rank}</div>
                      <div className="truncate font-bold text-[#4e1434]">
                        {r.nickname}
                        {isMe ? <span className="ml-2 text-xs font-black text-[#8dc63f]">YOU</span> : null}
                        {r.date ? <span className="ml-2 text-xs font-semibold text-[#ac7f95]">{r.date}</span> : null}
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-[#7d4562]">
                        {r.character ? (
                          <img
                            src={`/${r.character}.png`}
                            alt={r.character}
                            className="h-5 w-5 rounded-full bg-white"
                            draggable={false}
                          />
                        ) : null}
                        <span className="truncate">{characterLabel(r.character)}</span>
                      </div>
                      <div className="text-right font-black text-[#7d1148]">{r.score}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="mt-4 w-full rounded-xl border border-[#f2bed8] bg-[#fff4fa] px-4 py-3 font-black text-[#6f2b50]"
            type="button"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
