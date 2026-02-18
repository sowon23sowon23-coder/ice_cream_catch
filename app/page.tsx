"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "./lib/gtag";
import HomeScreen from "./components/HomeScreen";
import Game from "./components/Game";
import LeaderboardModal, { LeaderMode, LeaderRow } from "./components/LeaderboardModal";
import { supabase } from "./lib/supabaseClient";
import { STORE_OPTIONS } from "./lib/stores";

type CharId = "green" | "berry" | "sprinkle";
type Phase = "home" | "game";
type GameMode = "free" | "mission" | "timeAttack";

type DbRow = {
  nickname_key: string;
  nickname_display: string;
  score: number;
  updated_at: string;
  character?: CharId;
  store?: string;
};

function normalizeNick(raw: string) {
  return raw.trim().toLowerCase();
}

async function fetchMyBestScore(nicknameDisplay: string, selectedStore: string) {
  const key = normalizeNick(nicknameDisplay);

  const attempts = [
    () =>
      supabase
        .from("leaderboard_best_v2")
        .select("score,nickname_display,character,store")
        .eq("nickname_key", key)
        .eq("store", selectedStore)
        .maybeSingle(),
    () =>
      supabase
        .from("leaderboard_best_v2")
        .select("score,nickname_display,store")
        .eq("nickname_key", key)
        .eq("store", selectedStore)
        .maybeSingle(),
    () =>
      supabase
        .from("leaderboard_best_v2")
        .select("score,nickname_display,character")
        .eq("nickname_key", key)
        .maybeSingle(),
    () =>
      supabase
        .from("leaderboard_best_v2")
        .select("score,nickname_display")
        .eq("nickname_key", key)
        .maybeSingle(),
  ];

  let data: any = null;
  let error: any = null;
  for (const attempt of attempts) {
    const res = await attempt();
    data = res.data;
    error = res.error;
    if (!error) break;
  }

  if (error) throw error;
  if (!data) return undefined;

  const row = data as { score: number; nickname_display: string; character?: CharId | null; store?: string | null };
  return {
    score: row.score,
    display: row.nickname_display,
    character: row.character ?? undefined,
    store: row.store ?? selectedStore,
  };
}

function startOfTodayLocalISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function Page() {
  const [phase, setPhase] = useState<Phase>("home");
  const [character, setCharacter] = useState<CharId>("green");
  const [gameMode, setGameMode] = useState<GameMode>("free");
  const [best, setBest] = useState(0);
  const [startSignal, setStartSignal] = useState(0);

  const [lbOpen, setLbOpen] = useState(false);
  const [lbRows, setLbRows] = useState<LeaderRow[]>([]);
  const [lbLoading, setLbLoading] = useState(false);

  const [mode, setMode] = useState<LeaderMode>("today");
  const [selectedStore, setSelectedStore] = useState<string>(STORE_OPTIONS[0] ?? "Yogurtland Demo Vendor");

  const [lastScore, setLastScore] = useState<number | undefined>(undefined);
  const [lastNick, setLastNick] = useState<string | undefined>(undefined);
  const [myRank, setMyRank] = useState<number | undefined>(undefined);

  useEffect(() => {
    const b = Number(localStorage.getItem("bestScore") || 0);
    setBest(b);
    setLastNick(localStorage.getItem("nickname") ?? undefined);
    const savedStore = localStorage.getItem("selectedStore");
    if (savedStore && STORE_OPTIONS.includes(savedStore)) {
      setSelectedStore(savedStore);
    }
  }, [phase]);

  useEffect(() => {
    localStorage.setItem("selectedStore", selectedStore);
  }, [selectedStore]);

  const fetchTop20 = async (m: LeaderMode, store: string) => {
    setLbLoading(true);

    const attempts = [
      () => {
        let q = supabase
          .from("leaderboard_best_v2")
          .select("nickname_key,nickname_display,score,updated_at,character,store")
          .eq("store", store)
          .order("score", { ascending: false })
          .order("updated_at", { ascending: true })
          .limit(20);
        if (m === "today") q = q.gte("updated_at", startOfTodayLocalISO());
        return q;
      },
      () => {
        let q = supabase
          .from("leaderboard_best_v2")
          .select("nickname_key,nickname_display,score,updated_at,store")
          .eq("store", store)
          .order("score", { ascending: false })
          .order("updated_at", { ascending: true })
          .limit(20);
        if (m === "today") q = q.gte("updated_at", startOfTodayLocalISO());
        return q;
      },
      () => {
        let q = supabase
          .from("leaderboard_best_v2")
          .select("nickname_key,nickname_display,score,updated_at,character")
          .order("score", { ascending: false })
          .order("updated_at", { ascending: true })
          .limit(20);
        if (m === "today") q = q.gte("updated_at", startOfTodayLocalISO());
        return q;
      },
      () => {
        let q = supabase
          .from("leaderboard_best_v2")
          .select("nickname_key,nickname_display,score,updated_at")
          .order("score", { ascending: false })
          .order("updated_at", { ascending: true })
          .limit(20);
        if (m === "today") q = q.gte("updated_at", startOfTodayLocalISO());
        return q;
      },
    ];

    let data: any = null;
    let error: any = null;
    for (const attempt of attempts) {
      const res = await attempt();
      data = res.data;
      error = res.error;
      if (!error) break;
    }

    setLbLoading(false);

    if (error) {
      console.error(error);
      alert("Failed to load leaderboard.");
      return;
    }

    const list = (data as DbRow[]) ?? [];

    let rank = 0;
    let lastScoreLocal: number | null = null;

    const rows: LeaderRow[] = list.map((r, idx) => {
      if (lastScoreLocal === null || r.score !== lastScoreLocal) {
        rank = idx + 1;
        lastScoreLocal = r.score;
      }

      return {
        rank,
        nickname: r.nickname_display,
        score: r.score,
        date: new Date(r.updated_at).toLocaleDateString(),
        character: r.character,
      };
    });

    setLbRows(rows);
  };

  const calcMyRank = async (m: LeaderMode, score: number, store: string) => {
    const attempts = [
      () => {
        let q = supabase
          .from("leaderboard_best_v2")
          .select("nickname_key", { count: "exact", head: true })
          .eq("store", store)
          .gt("score", score);
        if (m === "today") q = q.gte("updated_at", startOfTodayLocalISO());
        return q;
      },
      () => {
        let q = supabase
          .from("leaderboard_best_v2")
          .select("nickname_key", { count: "exact", head: true })
          .gt("score", score);
        if (m === "today") q = q.gte("updated_at", startOfTodayLocalISO());
        return q;
      },
    ];

    let count: number | null = null;
    let error: any = null;
    for (const attempt of attempts) {
      const res = await attempt();
      count = res.count;
      error = res.error;
      if (!error) break;
    }
    if (error) {
      console.error(error);
      setMyRank(undefined);
      return;
    }

    setMyRank((count ?? 0) + 1);
  };

  const openLeaderboard = async () => {
    trackEvent({ action: "leaderboard_open", category: "engagement" });
    const nick = (localStorage.getItem("nickname") || "").trim();
    setLastNick(nick || undefined);

    await fetchTop20(mode, selectedStore);

    if (nick.length >= 2 && nick.length <= 12) {
      try {
        const mine = await fetchMyBestScore(nick, selectedStore);
        if (mine) {
          setLastScore(mine.score);
          await calcMyRank(mode, mine.score, selectedStore);
        } else {
          setLastScore(undefined);
          setMyRank(undefined);
        }
      } catch (e) {
        console.error(e);
        setLastScore(undefined);
        setMyRank(undefined);
      }
    } else {
      setLastScore(undefined);
      setMyRank(undefined);
    }

    setLbOpen(true);
  };

  const upsertBestScore = async (
    nicknameDisplay: string,
    score: number,
    selectedCharacter: CharId,
    store: string
  ) => {
    const nickname_key = normalizeNick(nicknameDisplay);

    const attempts = [
      () =>
        supabase.from("leaderboard_best_v2").upsert(
          [{ nickname_key, nickname_display: nicknameDisplay.trim(), score, character: selectedCharacter, store }],
          { onConflict: "nickname_key,store" }
        ),
      () =>
        supabase.from("leaderboard_best_v2").upsert(
          [{ nickname_key, nickname_display: nicknameDisplay.trim(), score, character: selectedCharacter, store }],
          { onConflict: "nickname_key" }
        ),
      () =>
        supabase.from("leaderboard_best_v2").upsert(
          [{ nickname_key, nickname_display: nicknameDisplay.trim(), score, store }],
          { onConflict: "nickname_key,store" }
        ),
      () =>
        supabase.from("leaderboard_best_v2").upsert(
          [{ nickname_key, nickname_display: nicknameDisplay.trim(), score, store }],
          { onConflict: "nickname_key" }
        ),
      () =>
        supabase.from("leaderboard_best_v2").upsert(
          [{ nickname_key, nickname_display: nicknameDisplay.trim(), score, character: selectedCharacter }],
          { onConflict: "nickname_key" }
        ),
      () =>
        supabase.from("leaderboard_best_v2").upsert(
          [{ nickname_key, nickname_display: nicknameDisplay.trim(), score }],
          { onConflict: "nickname_key" }
        ),
    ];

    let error: any = null;
    for (const attempt of attempts) {
      const res = await attempt();
      error = res.error;
      if (!error) break;
    }

    if (error) {
      console.error(error);
      alert("Failed to save score.");
    }
  };

  const onChangeMode = async (m: LeaderMode) => {
    setMode(m);
    await fetchTop20(m, selectedStore);

    if (lastScore !== undefined) {
      await calcMyRank(m, lastScore, selectedStore);
    } else {
      setMyRank(undefined);
    }
  };

  const onChangeStore = async (store: string) => {
    setSelectedStore(store);

    if (!lbOpen) return;

    const nick = (localStorage.getItem("nickname") || "").trim();
    await fetchTop20(mode, store);

    if (nick.length >= 2 && nick.length <= 12) {
      try {
        const mine = await fetchMyBestScore(nick, store);
        if (mine) {
          setLastScore(mine.score);
          await calcMyRank(mode, mine.score, store);
        } else {
          setLastScore(undefined);
          setMyRank(undefined);
        }
      } catch (e) {
        console.error(e);
        setLastScore(undefined);
        setMyRank(undefined);
      }
    }
  };

  return (
    <>
      <main className="min-h-screen overflow-auto bg-[radial-gradient(circle_at_15%_5%,#ffffff_0%,#ffeef8_35%,#f8d5e8_100%)] p-4">
        <div className="mx-auto flex w-full max-w-[390px] items-center justify-center">
          <div
            className="relative overflow-hidden rounded-[2rem] bg-white/95 shadow-[0_22px_60px_rgba(150,9,83,0.28)] ring-1 ring-[#f4c2db]"
            style={{
              width: "100%",
              minHeight: 844,
            }}
          >
            {phase === "home" && (
              <HomeScreen
                bestScore={best}
                stores={STORE_OPTIONS}
                selectedStore={selectedStore}
                onStoreChange={setSelectedStore}
                onStart={(char: CharId, mode: GameMode) => {
                  setCharacter(char);
                  setGameMode(mode);
                  setLastNick(localStorage.getItem("nickname") ?? undefined);
                  setPhase("game");
                  setStartSignal((n) => n + 1);
                }}
                onOpenLeaderboard={openLeaderboard}
              />
            )}

            {phase === "game" && (
              <Game
                character={character}
                mode={gameMode}
                startSignal={startSignal}
                onExitToHome={() => setPhase("home")}
                onBestScore={(newBest: number) => {
                  setBest(newBest);
                  localStorage.setItem("bestScore", String(newBest));
                }}
                onGameOver={async (finalScore: number) => {
                  const nick = (localStorage.getItem("nickname") || "").trim();

                  setLastNick(nick || undefined);
                  setLastScore(finalScore);

                  if (nick.length >= 2 && nick.length <= 12) {
                    await upsertBestScore(nick, finalScore, character, selectedStore);
                    await calcMyRank(mode, finalScore, selectedStore);
                  } else {
                    setMyRank(undefined);
                  }

                  await fetchTop20(mode, selectedStore);
                  setLbOpen(true);
                }}
              />
            )}
          </div>
        </div>
      </main>

      <LeaderboardModal
        open={lbOpen}
        onClose={() => setLbOpen(false)}
        rows={lbRows}
        loading={lbLoading}
        stores={STORE_OPTIONS}
        selectedStore={selectedStore}
        onStoreChange={onChangeStore}
        myNickname={lastNick}
        myScore={lastScore}
        myRank={myRank}
        mode={mode}
        onModeChange={onChangeMode}
      />
    </>
  );
}

