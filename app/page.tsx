"use client";

import { useEffect, useState } from "react";
import HomeScreen from "./components/HomeScreen";
import Game from "./components/Game";
import LeaderboardModal, { LeaderMode, LeaderRow } from "./components/LeaderboardModal";
import { supabase } from "./lib/supabaseClient";

type CharId = "green" | "berry" | "sprinkle";
type Phase = "home" | "game";

type DbRow = {
  nickname_key: string;
  nickname_display: string;
  score: number;
  updated_at: string;
};

function normalizeNick(raw: string) {
  return raw.trim().toLowerCase(); // ✅ 대소문자 통합 핵심
}

async function fetchMyBestScore(nicknameDisplay: string) {
  const key = normalizeNick(nicknameDisplay);

  const { data, error } = await supabase
    .from("leaderboard_best_v2")
    .select("score,nickname_display")
    .eq("nickname_key", key)
    .maybeSingle();

  if (error) throw error;
  if (!data) return undefined;

  return { score: data.score as number, display: data.nickname_display as string };
}


function startOfTodayLocalISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0); // 로컬 기준 "오늘 0시"
  return d.toISOString(); // UTC로 변환된 ISO (Supabase timestamptz와 비교 가능)
}

export default function Page() {
  const [phase, setPhase] = useState<Phase>("home");
  const [character, setCharacter] = useState<CharId>("green");
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
      .select("nickname_key,nickname_display,score,updated_at")
      .order("score", { ascending: false })
      .order("updated_at", { ascending: true })
      .limit(20);

    if (m === "today") {
      q = q.gte("updated_at", startOfTodayLocalISO());
    }

    const { data, error } = await q;
    setLbLoading(false);

    if (error) {
      console.error(error);
      alert("랭킹 불러오기에 실패했어. (콘솔 확인)");
      return;
    }

    const list = (data as DbRow[]) ?? [];

    // ✅ 동점 공동순위 (1,1,3)
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

  // Top20 먼저
  await fetchTop20(mode);

  // ✅ 내 best + 내 rank도 같이
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


  const upsertBestScore = async (nicknameDisplay: string, score: number) => {
    const nickname_key = normalizeNick(nicknameDisplay);

    const { error } = await supabase
      .from("leaderboard_best_v2")
      .upsert(
        [{ nickname_key, nickname_display: nicknameDisplay.trim(), score }],
        { onConflict: "nickname_key" }
      );

    if (error) {
      console.error(error);
      alert("점수 업로드 실패! (콘솔 확인)");
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
          onStart={(char: CharId) => {
            setCharacter(char);
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
              await upsertBestScore(nick, finalScore);
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
