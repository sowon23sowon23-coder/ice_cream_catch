"use client";

import { useEffect, useState } from "react";
import HomeScreen from "./components/HomeScreen";
import Game from "./components/Game";
import LeaderboardModal, { LeaderMode, LeaderRow } from "./components/LeaderboardModal";
import { supabase } from "./lib/supabaseClient";

type CharId = "green" | "berry" | "sprinkle";
type Phase = "home" | "game";
type GameMode = "free" | "mission" | "timeAttack";

type DbRow = {
  nickname_key: string;
  nickname_display: string;
  score: number;
  updated_at: string;
  character?: CharId;
};

function normalizeNick(raw: string) {
  return raw.trim().toLowerCase();
}

async function fetchMyBestScore(nicknameDisplay: string) {
  const key = normalizeNick(nicknameDisplay);

  const initial = await supabase
    .from("leaderboard_best_v2")
    .select("score,nickname_display,character")
    .eq("nickname_key", key)
    .maybeSingle();
  let data: any = initial.data;
  let error: any = initial.error;

  if (error && String(error.message).toLowerCase().includes("character")) {
    const fallback = await supabase
      .from("leaderboard_best_v2")
      .select("score,nickname_display")
      .eq("nickname_key", key)
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;
  if (!data) return undefined;

  const row = data as { score: number; nickname_display: string; character?: CharId | null };
  return {
    score: row.score,
    display: row.nickname_display,
    character: row.character ?? undefined,
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

  const [lastScore, setLastScore] = useState<number | undefined>(undefined);
  const [lastNick, setLastNick] = useState<string | undefined>(undefined);
  const [myRank, setMyRank] = useState<number | undefined>(undefined);

  useEffect(() => {
    const b = Number(localStorage.getItem("bestScore") || 0);
    setBest(b);
    setLastNick(localStorage.getItem("nickname") ?? undefined);
  }, [phase]);

  const fetchTop20 = async (m: LeaderMode) => {
    setLbLoading(true);

    let q = supabase
      .from("leaderboard_best_v2")
      .select("nickname_key,nickname_display,score,updated_at,character")
      .order("score", { ascending: false })
      .order("updated_at", { ascending: true })
      .limit(20);

    if (m === "today") {
      q = q.gte("updated_at", startOfTodayLocalISO());
    }

    const initial = await q;
    let data: any = initial.data;
    let error: any = initial.error;

    if (error && String(error.message).toLowerCase().includes("character")) {
      let qFallback = supabase
        .from("leaderboard_best_v2")
        .select("nickname_key,nickname_display,score,updated_at")
        .order("score", { ascending: false })
        .order("updated_at", { ascending: true })
        .limit(20);

      if (m === "today") {
        qFallback = qFallback.gte("updated_at", startOfTodayLocalISO());
      }

      const fallback = await qFallback;
      data = fallback.data;
      error = fallback.error;
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

  const calcMyRank = async (m: LeaderMode, score: number) => {
    let q = supabase
      .from("leaderboard_best_v2")
      .select("nickname_key", { count: "exact", head: true })
      .gt("score", score);

    if (m === "today") {
      q = q.gte("updated_at", startOfTodayLocalISO());
    }

    const { count, error } = await q;
    if (error) {
      console.error(error);
      setMyRank(undefined);
      return;
    }

    setMyRank((count ?? 0) + 1);
  };

  const openLeaderboard = async () => {
    const nick = (localStorage.getItem("nickname") || "").trim();
    setLastNick(nick || undefined);

    await fetchTop20(mode);

    if (nick.length >= 2 && nick.length <= 12) {
      try {
        const mine = await fetchMyBestScore(nick);
        if (mine) {
          setLastScore(mine.score);
          await calcMyRank(mode, mine.score);
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
    selectedCharacter: CharId
  ) => {
    const nickname_key = normalizeNick(nicknameDisplay);

    let { error } = await supabase.from("leaderboard_best_v2").upsert(
      [{ nickname_key, nickname_display: nicknameDisplay.trim(), score, character: selectedCharacter }],
      { onConflict: "nickname_key" }
    );

    if (error && String(error.message).toLowerCase().includes("character")) {
      const fallback = await supabase
        .from("leaderboard_best_v2")
        .upsert([{ nickname_key, nickname_display: nicknameDisplay.trim(), score }], {
          onConflict: "nickname_key",
        });
      error = fallback.error;
    }

    if (error) {
      console.error(error);
      alert("Failed to save score.");
    }
  };

  const onChangeMode = async (m: LeaderMode) => {
    setMode(m);
    await fetchTop20(m);

    if (lastScore !== undefined) {
      await calcMyRank(m, lastScore);
    } else {
      setMyRank(undefined);
    }
  };

  return (
    <>
      {phase === "home" && (
        <HomeScreen
          bestScore={best}
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
              await upsertBestScore(nick, finalScore, character);
              await calcMyRank(mode, finalScore);
            } else {
              setMyRank(undefined);
            }

            await fetchTop20(mode);
            setLbOpen(true);
          }}
        />
      )}

      <LeaderboardModal
        open={lbOpen}
        onClose={() => setLbOpen(false)}
        rows={lbRows}
        loading={lbLoading}
        myNickname={lastNick}
        myScore={lastScore}
        myRank={myRank}
        mode={mode}
        onModeChange={onChangeMode}
      />
    </>
  );
}
