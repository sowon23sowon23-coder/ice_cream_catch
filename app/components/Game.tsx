"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { trackEvent } from "../lib/gtag";

type CharId = "green" | "berry" | "sprinkle";
type GameMode = "free" | "mission" | "timeAttack";

const FALLING_ITEM_CANDIDATES = [
  "gummy-bear.png",
  "green-gummy-bear.png",
  "yellow-gummy-bear.png",
  "red-gummy-bear.png",
  "orange-gummy-bear.png",
  "strawberry.png",
  "kiwi.png",
  "pineapple.png",
  "mango.png",
  "cookie.png",
  "m-and-m-brown.png",
  "m-and-m-red.png",
  "m-and-m-orange.png",
] as const;
type MissionItemImage = string;

type FallingItem = { id: number; x: number; y: number; v: number; emoji?: string; image?: string };
type Pop = { id: number; x: number; y: number; text: string; born: number };
type CaughtItem = { id: number; emoji?: string; image?: string; x: number; y: number; rotate: number; scale: number };

const GAME_BG_CANDIDATES = [
  "/game-bg-1.jpg",
  "/game-bg-2.jpg",
  "/game-bg-1.jpeg",
  "/game-bg-2.jpeg",
  "/game-bg-1.png",
  "/game-bg-2.png",
] as const;

const DEFAULT_GAME_BG =
  "radial-gradient(circle at 18% 18%, rgba(255,255,255,0.48), transparent 36%), linear-gradient(180deg, #99dcff 0%, #70c9ff 48%, #4ca6e8 100%)";
const FREE_DIFFICULTY_STEP = 20;
const FREE_SPEED_PER_LEVEL = 0.15;

function randomMissionTargetsFrom(images: readonly string[]) {
  if (images.length === 0) return [];
  const maxCount = Math.min(5, images.length);
  const minCount = Math.min(2, maxCount);
  const count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
  const shuffled = [...images].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default function Game({
  character,
  mode,
  startSignal,
  onExitToHome,
  onBestScore,
  onGameOver,
}: {
  character: CharId;
  mode: GameMode;
  startSignal: number;
  onExitToHome: () => void;
  onBestScore: (best: number) => void;
  onGameOver?: (finalScore: number) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "play" | "over">("idle");
  const [countdown, setCountdown] = useState<"mission" | "ready" | "go" | null>(null);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(5);
  const [difficultyLevel, setDifficultyLevel] = useState(0);
  const [difficultyNotice, setDifficultyNotice] = useState<string | null>(null);
  const [fanfareNotice, setFanfareNotice] = useState(false);
  const [fireworkSeed, setFireworkSeed] = useState(0);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [playerX, setPlayerX] = useState(50);
  const [missionTargets, setMissionTargets] = useState<MissionItemImage[]>([]);
  const [fallingItemImages, setFallingItemImages] = useState<string[]>(["gummy-bear.png"]);

  const [items, setItems] = useState<FallingItem[]>([]);
  const [pops, setPops] = useState<Pop[]>([]);

  const [tilt, setTilt] = useState(0);
  const [bounce, setBounce] = useState(false);
  const [shake, setShake] = useState(false);
  const [gameBg, setGameBg] = useState<string | null>(null);
  const [finalCupLoadFailed, setFinalCupLoadFailed] = useState(false);

  const [collectedToppings, setCollectedToppings] = useState<CaughtItem[]>([]);

  const areaRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);
  const popIdRef = useRef(0);
  const lastLifeLossRef = useRef(0);
  const spawnRef = useRef<number | null>(null);
  const loopRef = useRef<number | null>(null);
  const noticeTimeoutRef = useRef<number | null>(null);
  const fanfareTimeoutRef = useRef<number | null>(null);
  const playerXRef = useRef(50);
  const gameOverFiredRef = useRef(false);
  const difficultyLevelRef = useRef(0);
  const nextFanfareScoreRef = useRef(20);
  const pausedRef = useRef(false);
  const collectedRef = useRef<CaughtItem[]>([]);
  const leaderboardOpenedRef = useRef(false);

  const missionSet = useMemo(() => new Set(missionTargets), [missionTargets]);
  const isPaused = phase === "play" && fanfareNotice;
  const fireworkPieces = useMemo(() => {
    return Array.from({ length: 26 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 26 + Math.random() * 0.2;
      const distance = 72 + Math.random() * 110;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      const hue = Math.floor(Math.random() * 360);
      const delay = Math.random() * 0.25;
      const size = 6 + Math.random() * 8;

      return {
        id: i,
        tx,
        ty,
        delay,
        size,
        color: `hsl(${hue} 100% 60%)`,
      };
    });
  }, [fireworkSeed]);

  useEffect(() => {
    playerXRef.current = playerX;
  }, [playerX]);

  useEffect(() => {
    difficultyLevelRef.current = difficultyLevel;
  }, [difficultyLevel]);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(
    () => () => {
      if (noticeTimeoutRef.current !== null) {
        clearTimeout(noticeTimeoutRef.current);
      }
      if (fanfareTimeoutRef.current !== null) {
        clearTimeout(fanfareTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    let active = true;

    const canLoad = (src: string) =>
      new Promise<boolean>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
      });

    (async () => {
      const checks = await Promise.all(GAME_BG_CANDIDATES.map((src) => canLoad(src)));
      const available = GAME_BG_CANDIDATES.filter((_, i) => checks[i]);
      if (!active || available.length === 0) return;
      const randomIndex = Math.floor(Math.random() * available.length);
      setGameBg(available[randomIndex]);
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const canLoad = (src: string) =>
      new Promise<boolean>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
      });

    (async () => {
      const checks = await Promise.all(FALLING_ITEM_CANDIDATES.map((name) => canLoad(`/${name}`)));
      const available = FALLING_ITEM_CANDIDATES.filter((_, i) => checks[i]);
      if (!active) return;
      if (available.length > 0) {
        setFallingItemImages([...available]);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const stopAll = () => {
    if (spawnRef.current !== null) {
      clearInterval(spawnRef.current);
      spawnRef.current = null;
    }
    if (loopRef.current !== null) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
  };

  const finishGame = () => {
    if (gameOverFiredRef.current) return;
    gameOverFiredRef.current = true;

    stopAll();
    setPhase("over");
    trackEvent({ action: "game_over", category: "game", label: mode, value: score });

    const best = Number(localStorage.getItem("bestScore") || 0);
    if (score > best) {
      localStorage.setItem("bestScore", String(score));
      onBestScore(score);
      trackEvent({ action: "new_best_score", category: "game", label: mode, value: score });
    }

    if (mode === "timeAttack") {
      // Show Final Reveal Screen — leaderboard opens when user taps "See Leaderboard"
      setCollectedToppings([...collectedRef.current]);
      return;
    }

    onGameOver?.(score);
  };

  const start = () => {
    idRef.current = 0;
    popIdRef.current = 0;
    lastLifeLossRef.current = 0;
    playerXRef.current = 50;
    gameOverFiredRef.current = false;
    collectedRef.current = [];
    leaderboardOpenedRef.current = false;
    setCollectedToppings([]);
    setFinalCupLoadFailed(false);

    setScore(0);
    setLives(3);
    setTimeLeft(5);
    setDifficultyLevel(0);
    setDifficultyNotice(null);
    setFanfareNotice(false);
    setShareNotice(null);
    setPlayerX(50);
    setItems([]);
    setPops([]);
    setTilt(0);
    setBounce(false);
    setShake(false);
    difficultyLevelRef.current = 0;
    if (noticeTimeoutRef.current !== null) {
      clearTimeout(noticeTimeoutRef.current);
      noticeTimeoutRef.current = null;
    }
    if (fanfareTimeoutRef.current !== null) {
      clearTimeout(fanfareTimeoutRef.current);
      fanfareTimeoutRef.current = null;
    }
    nextFanfareScoreRef.current = 20;

    trackEvent({ action: "game_start", category: "game", label: mode, value: 0 });

    if (mode === "mission") {
      setMissionTargets(randomMissionTargetsFrom(fallingItemImages));
      setCountdown("mission");
      setPhase("idle");

      window.setTimeout(() => setCountdown("ready"), 1400);
      window.setTimeout(() => setCountdown("go"), 1850);
      window.setTimeout(() => {
        setCountdown(null);
        setPhase("play");
      }, 2300);
      return;
    }

    setMissionTargets([]);
    setCountdown("ready");
    setPhase("idle");

    window.setTimeout(() => setCountdown("go"), 450);
    window.setTimeout(() => {
      setCountdown(null);
      setPhase("play");
    }, 900);
  };

  useEffect(() => {
    if (!startSignal) return;
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSignal]);

  useEffect(() => {
    if (mode !== "free" || phase !== "play") return;
    const nextLevel = Math.floor(score / FREE_DIFFICULTY_STEP);
    if (nextLevel <= difficultyLevelRef.current) return;

    difficultyLevelRef.current = nextLevel;
    setDifficultyLevel(nextLevel);
    setDifficultyNotice(`Difficulty Up! Lv.${nextLevel}`);

    if (noticeTimeoutRef.current !== null) {
      clearTimeout(noticeTimeoutRef.current);
    }
    noticeTimeoutRef.current = window.setTimeout(() => {
      setDifficultyNotice(null);
      noticeTimeoutRef.current = null;
    }, 1400);
  }, [mode, phase, score]);

  useEffect(() => {
    if (mode !== "free" || phase !== "play") return;
    if (score < nextFanfareScoreRef.current) return;

    while (score >= nextFanfareScoreRef.current) {
      nextFanfareScoreRef.current += 20;
    }
    trackEvent({ action: "fanfare_reached", category: "game", label: `score_${score}`, value: score });
    setFireworkSeed((n) => n + 1);
    setFanfareNotice(true);
    if (fanfareTimeoutRef.current !== null) {
      clearTimeout(fanfareTimeoutRef.current);
    }
    fanfareTimeoutRef.current = window.setTimeout(() => {
      setFanfareNotice(false);
      fanfareTimeoutRef.current = null;
    }, 1800);
  }, [mode, phase, score]);

  const PLAYER_W = 80;

  const handleShare = async () => {
    const url = window.location.href;
    const title = "Ice Cream Catcher";
    const text = `I scored ${score} points in Ice Cream Catcher! Try it here:`;

    trackEvent({ action: "share_click", category: "engagement", label: `score_${score}`, value: score });

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        setShareNotice("Shared successfully.");
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareNotice("Game link copied.");
        return;
      }

      setShareNotice("Copy this link and share it.");
      window.prompt("Copy this link:", url);
    } catch {
      setShareNotice("Share canceled.");
    }
  };

  const move = (clientX: number) => {
    if (isPaused) return;
    const r = areaRef.current?.getBoundingClientRect();
    if (!r) return;

    const xPx = clientX - r.left;
    const clamped = Math.max(PLAYER_W / 2, Math.min(r.width - PLAYER_W / 2, xPx));
    const pct = (clamped / r.width) * 100;

    setPlayerX(pct);
    setTilt((pct - 50) / 10);
    setBounce(true);
    setTimeout(() => setBounce(false), 140);
  };

  useEffect(() => {
    if (phase !== "play") return;
    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, [phase, isPaused]);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;

    const handler = (e: TouchEvent) => {
      if (phase !== "play" || isPaused) return;
      e.preventDefault();
      if (e.touches && e.touches.length > 0) move(e.touches[0].clientX);
    };

    el.addEventListener("touchmove", handler, { passive: false });
    return () => el.removeEventListener("touchmove", handler);
  }, [phase, isPaused]);

  useEffect(() => {
    if (phase !== "play") return;
    if (mode === "timeAttack") return;
    if (lives > 0) return;
    finishGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lives, mode, phase, score]);

  useEffect(() => {
    if (phase !== "play") return;
    if (mode !== "timeAttack") return;
    if (timeLeft > 0) return;
    finishGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, phase, timeLeft, score]);

  useEffect(() => {
    if (phase !== "play") return;
    if (mode !== "timeAttack") return;

    const timer = window.setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [mode, phase]);

  useEffect(() => {
    if (phase !== "play") {
      stopAll();
      return;
    }
    if (loopRef.current !== null) return;

    spawnRef.current = window.setInterval(() => {
      if (pausedRef.current) return;
      let itemData: { emoji?: string; image?: string };
      const randomImage = fallingItemImages[Math.floor(Math.random() * fallingItemImages.length)] ?? "gummy-bear.png";
      itemData = { image: randomImage };

      setItems((v) => [
        ...v,
        { id: idRef.current++, x: Math.random() * 90 + 5, y: -5, v: 1.2 + Math.random() * 2.4, ...itemData },
      ]);
    }, 900);

    loopRef.current = window.setInterval(() => {
      if (pausedRef.current) return;
      const now = performance.now();
      const px = playerXRef.current;

      setItems((prev) => {
        let gained = 0;
        let lifeLoss = 0;
        const popsToAdd: Pop[] = [];
        const next: FallingItem[] = [];

        for (const item of prev) {
          const speedMultiplier =
            mode === "free" ? 1 + difficultyLevelRef.current * FREE_SPEED_PER_LEVEL : 1;
          const ny = item.y + item.v * speedMultiplier;
          const isMissionTarget = item.image ? missionSet.has(item.image) : false;

          if (Math.abs(item.x - px) < 8 && ny > 85) {
            if (mode === "mission") {
              if (isMissionTarget) {
                gained += 1;
                popsToAdd.push({
                  id: popIdRef.current++,
                  x: item.x,
                  y: 88,
                  text: "+1",
                  born: now,
                });
              } else {
                lifeLoss += 1;
                popsToAdd.push({
                  id: popIdRef.current++,
                  x: item.x,
                  y: 88,
                  text: "X",
                  born: now,
                });
              }
            } else {
              gained += 1;
              popsToAdd.push({
                id: popIdRef.current++,
                x: item.x,
                y: 88,
                text: "+1",
                born: now,
              });
              // Track caught items for Time Attack reveal screen
              if (mode === "timeAttack") {
                collectedRef.current.push({
                  id: item.id,
                  emoji: item.emoji,
                  image: item.image,
                  x: 15 + Math.random() * 70,
                  y: 8 + Math.random() * 50,
                  rotate: Math.random() * 40 - 20,
                  scale: 0.8 + Math.random() * 0.45,
                });
              }
            }
            continue;
          }

          if (ny > 105) {
            if (mode === "mission") {
              if (isMissionTarget) {
                lifeLoss += 1;
              }
            } else {
              if (mode !== "timeAttack") {
                lifeLoss += 1;
              }
            }
            continue;
          }

          next.push({ ...item, y: ny });
        }

        if (gained) setScore((s) => s + gained);

        if (lifeLoss) {
          const now2 = performance.now();
          if (now2 - lastLifeLossRef.current >= 400) {
            lastLifeLossRef.current = now2;
            setPops((ps) =>
              ps.concat([
                { id: popIdRef.current++, x: playerXRef.current, y: 90, text: "-1 life", born: now2 },
              ])
            );
            setShake(true);
            setTimeout(() => setShake(false), 180);
            setLives((l) => Math.max(0, l - 1));
          }
        }

        setPops((ps) => ps.concat(popsToAdd).filter((p) => now - p.born < 700));
        return next;
      });
    }, 30);

    return () => stopAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, mode, missionSet, fallingItemImages]);

  return (
    <main className="h-full min-h-full bg-gradient-to-b from-pink-100 to-blue-100 flex items-center justify-center p-4">
      <style jsx global>{`
        @keyframes shake {
          0% {
            transform: translate3d(0, 0, 0);
          }
          20% {
            transform: translate3d(-3px, 0, 0);
          }
          40% {
            transform: translate3d(3px, 0, 0);
          }
          60% {
            transform: translate3d(-2px, 0, 0);
          }
          80% {
            transform: translate3d(2px, 0, 0);
          }
          100% {
            transform: translate3d(0, 0, 0);
          }
        }
        .animate-shake {
          animation: shake 0.18s ease-in-out;
        }
        @keyframes bubbleFloat {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: 0.45;
          }
          100% {
            transform: translateY(-130px) scale(1.15);
            opacity: 0;
          }
        }
        .bubble-float {
          animation-name: bubbleFloat;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @keyframes fireworkBurst {
          0% {
            transform: translate3d(0, 0, 0) scale(0.25);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          100% {
            transform: translate3d(var(--tx), var(--ty), 0) scale(1);
            opacity: 0;
          }
        }
        .firework-piece {
          animation: fireworkBurst 900ms ease-out forwards;
        }
        @keyframes toppingReveal {
          0%   { opacity: 0; transform: rotate(var(--rot)) scale(0.3) translateY(-22px); }
          65%  { opacity: 1; transform: rotate(var(--rot)) scale(1.12) translateY(3px); }
          100% { opacity: 1; transform: rotate(var(--rot)) scale(1) translateY(0); }
        }
        .topping-reveal {
          animation: toppingReveal 0.45s ease-out forwards;
          opacity: 0;
        }
        @keyframes revealFadeIn {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .reveal-fade-in {
          animation: revealFadeIn 0.4s ease-out forwards;
        }
      `}</style>

      <div className="w-full max-w-md">
        <div className="text-center mb-3 font-bold text-pink-600">
          {mode === "timeAttack"
            ? `Score ${score} | Time ${timeLeft}s`
            : mode === "free"
              ? `Score ${score} | Lives ${lives} | Lv ${difficultyLevel}`
              : `Score ${score} | Lives ${lives}`}
        </div>

        {mode === "mission" && missionTargets.length > 0 && (
          <div className="mb-3 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2 text-center text-sm font-bold text-amber-900">
            <p>Catch only:</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              {missionTargets.map((target) => (
                <img key={target} src={`/${target}`} alt={target} className="h-7 w-7 object-contain" draggable={false} />
              ))}
            </div>
          </div>
        )}

        <div
          ref={areaRef}
          onMouseMove={(e) => phase === "play" && move(e.clientX)}
          className={`relative aspect-[3/4] rounded-3xl overflow-hidden shadow-xl ring-1 ring-white/50 touch-none ${
            shake ? "animate-shake" : ""
          }`}
          style={{
            backgroundImage: gameBg
              ? `linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.18)), url(${gameBg})`
              : DEFAULT_GAME_BG,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 pointer-events-none z-0">
            <div className="absolute -top-10 -left-6 h-40 w-40 rounded-full bg-white/25 blur-2xl" />
            <div className="absolute top-12 -right-10 h-36 w-36 rounded-full bg-cyan-100/30 blur-2xl" />
            <div className="absolute bottom-[-4.5rem] left-[-2rem] h-36 w-44 rounded-[50%] bg-white/35 blur-md" />
            <div className="absolute bottom-[-4rem] right-[-2rem] h-32 w-40 rounded-[50%] bg-white/30 blur-md" />
          </div>

          <div className="absolute inset-0 pointer-events-none z-0">
            {[8, 22, 34, 48, 61, 77, 90].map((left, idx) => (
              <span
                key={`bubble-${left}`}
                className="bubble-float absolute bottom-4 rounded-full bg-white/35"
                style={{
                  left: `${left}%`,
                  width: `${10 + (idx % 3) * 4}px`,
                  height: `${10 + (idx % 3) * 4}px`,
                  animationDelay: `${idx * 0.65}s`,
                  animationDuration: `${4.8 + (idx % 3) * 1.2}s`,
                }}
              />
            ))}
          </div>

          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white/30 to-transparent pointer-events-none z-0" />

          {mode === "free" && phase === "play" && difficultyNotice && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 rounded-full bg-fuchsia-600/90 text-white text-xs font-extrabold px-4 py-2 shadow-lg">
              {difficultyNotice}
            </div>
          )}

          {mode === "free" && phase === "play" && fanfareNotice && (
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <div className="absolute inset-0 bg-white/15 backdrop-blur-[1px]" />
              {fireworkPieces.map((piece) => (
                <span
                  key={`${fireworkSeed}-${piece.id}`}
                  className="firework-piece absolute left-1/2 top-1/2 rounded-full"
                  style={
                    {
                      width: `${piece.size}px`,
                      height: `${piece.size}px`,
                      backgroundColor: piece.color,
                      boxShadow: `0 0 10px ${piece.color}`,
                      animationDelay: `${piece.delay}s`,
                      "--tx": `${piece.tx}px`,
                      "--ty": `${piece.ty}px`,
                    } as CSSProperties
                  }
                />
              ))}
              <div className="rounded-3xl bg-amber-300/95 text-amber-950 px-8 py-5 shadow-2xl text-center border-2 border-white/60">
                <div className="text-2xl font-black tracking-wide">Fanfare!</div>
                <div className="mt-1 text-sm font-extrabold">Free Play 10 Points!</div>
                <div className="mt-1 text-xs font-bold">Paused</div>
              </div>
            </div>
          )}

          {countdown && (
            <div className="absolute inset-0 z-30 flex items-center justify-center">
              <div className="px-8 py-4 rounded-3xl bg-white/80 backdrop-blur-md border border-black/5 shadow-2xl text-center">
                {countdown === "mission" ? (
                  <>
                    <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-amber-700 mb-2">
                      Topping Mission
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      {missionTargets.map((target) => (
                        <img
                          key={`countdown-${target}`}
                          src={`/${target}`}
                          alt={target}
                          className="h-9 w-9 object-contain"
                          draggable={false}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-4xl font-black text-pink-600">
                    {countdown === "ready" ? "READY" : "GO!"}
                  </div>
                )}
              </div>
            </div>
          )}

          {(phase === "idle" || (phase === "over" && mode !== "timeAttack")) && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/55 backdrop-blur-sm">
              <div className="text-5xl mb-3">{phase === "over" ? "💥" : "🍨"}</div>
              <div className="text-xl font-extrabold text-pink-600 mb-2">
                {phase === "over" ? "Game Over!" : "Loading..."}
              </div>

              <div className="mb-5 flex flex-col items-center">
                <img
                  src={`/${character}.png`}
                  alt={character}
                  className="w-20 h-20 select-none pointer-events-none drop-shadow"
                  draggable={false}
                />
              </div>

              {phase === "over" && (
                <>
                  <div className="text-sm font-bold text-slate-700 mb-3">
                    Your Score: <span className="font-black text-pink-600">{score}</span>
                  </div>

                  <button
                    type="button"
                    onClick={start}
                    className="px-10 py-4 rounded-full bg-pink-500 text-white font-extrabold shadow-lg active:scale-95 transition"
                  >
                    Retry
                  </button>

                  <button
                    type="button"
                    onClick={handleShare}
                    className="mt-3 px-8 py-3 rounded-full bg-sky-500 text-white font-extrabold shadow-lg active:scale-95 transition"
                  >
                    Share With Friends
                  </button>

                  {shareNotice && (
                    <div className="mt-2 text-xs font-bold text-slate-700">{shareNotice}</div>
                  )}

                  <button
                    type="button"
                    onClick={onExitToHome}
                    className="mt-3 text-sm font-bold text-pink-700/80 underline underline-offset-4"
                  >
                    Back to Home
                  </button>
                </>
              )}
            </div>
          )}

          {items.map((item) => (
            <div
              key={item.id}
              style={{ left: `${item.x}%`, top: `${item.y}%` }}
              className="absolute text-4xl flex items-center justify-center w-8 h-8"
            >
              {item.image ? (
                <img src={`/${item.image}`} alt="falling item" draggable={false} className="w-8 h-8" />
              ) : (
                item.emoji
              )}
            </div>
          ))}

          {pops.map((p) => {
            const age = (performance.now() - p.born) / 1000;
            const opacity = Math.max(0, 1 - age / 0.7);
            const rise = Math.min(12, age * 20);

            return (
              <div
                key={p.id}
                className="absolute font-extrabold text-pink-600 pointer-events-none select-none"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y - rise}%`,
                  opacity,
                  transform: `translateX(-50%) rotate(${tilt}deg) scale(${bounce ? 1.08 : 1})`,
                  transition: "transform 120ms ease",
                  textShadow: "0 2px 10px rgba(0,0,0,0.12)",
                }}
              >
                {p.text}
              </div>
            );
          })}

          {phase === "play" && (
            <div
              className="absolute bottom-0"
              style={{ left: `${playerX}%`, transform: "translateX(-50%)", width: 96, height: 96 }}
            >
              <img
                src={`/${character}.png`}
                alt="character"
                draggable={false}
                className="w-24 select-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Time Attack Final Reveal Screen ── */}
      {phase === "over" && mode === "timeAttack" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden px-3 py-3 sm:py-6"
          style={{
            background:
              "radial-gradient(circle at 50% 0%, #fff8fc 0%, #fce4f0 50%, #f3c0db 100%)",
          }}
        >
          <div className="reveal-fade-in flex h-[100dvh] max-h-[100dvh] w-full max-w-md flex-col items-center justify-between gap-2 px-3 py-2 text-center sm:gap-3 sm:px-4 sm:py-3">
            {/* Header */}
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#960953]">
                Time Attack
              </p>
              <h2 className="mt-0.5 text-3xl font-black text-[#4b0b31]">Time&apos;s Up! 🍦</h2>
              <p className="mt-1 text-sm font-bold text-[#7d3060]">
                {score >= 25
                  ? "Amazing! 🌟"
                  : score >= 15
                    ? "Great job! 🎉"
                    : score >= 5
                      ? "Nice catch! ✨"
                      : "Keep going! 🍨"}
              </p>
            </div>

            {/* Score badge */}
            <div className="rounded-2xl bg-white/85 px-8 py-2 shadow ring-1 ring-[#f4c2db] sm:px-9 sm:py-2.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#960953]">Score</p>
              <p className="text-4xl font-black text-[#4b0b31] sm:text-[2.6rem]">{score}</p>
            </div>

            {/* Cup + toppings */}
            <div className="relative h-72 w-64 max-w-full sm:h-80 sm:w-72 lg:h-96 lg:w-80">
              {!finalCupLoadFailed ? (
                <img
                  src="/final-cup.png?v=20260223"
                  alt="Your ice cream cup"
                  className="h-full w-full select-none object-contain drop-shadow-xl"
                  draggable={false}
                  onLoad={() => setFinalCupLoadFailed(false)}
                  onError={() => setFinalCupLoadFailed(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-[2rem] bg-white/45 ring-1 ring-[#f4c2db]">
                  <span className="text-7xl">🍨</span>
                </div>
              )}
              {collectedToppings.slice(0, 22).map((t, i) => (
                <div
                  key={t.id}
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${t.x}%`, top: `${t.y}%` }}
                >
                  <div
                    className="topping-reveal"
                    style={
                      {
                        "--rot": `${t.rotate}deg`,
                        animationDelay: `${i * 55}ms`,
                      } as CSSProperties
                    }
                  >
                    {t.image ? (
                      <img
                        src={`/${t.image}`}
                        alt=""
                        className="h-7 w-7"
                        draggable={false}
                        style={{ transform: `scale(${t.scale})` }}
                      />
                    ) : (
                      <span
                        className="text-2xl leading-none"
                        style={{ display: "block", transform: `scale(${t.scale})` }}
                      >
                        {t.emoji}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex w-full max-w-sm flex-col gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!leaderboardOpenedRef.current) {
                    leaderboardOpenedRef.current = true;
                    onGameOver?.(score);
                  }
                }}
                className="w-full rounded-2xl bg-[#960953] py-2.5 text-sm font-black text-white shadow-[0_10px_24px_rgba(150,9,83,0.35)] transition active:scale-95 sm:py-3"
              >
                🏆 See Leaderboard
              </button>

              <button
                type="button"
                onClick={start}
                className="w-full rounded-2xl border-2 border-[#f2bfd9] bg-white py-2.5 text-sm font-black text-[#960953] transition active:scale-95 sm:py-3"
              >
                Retry
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="w-full rounded-2xl border border-[#f2bfd9] bg-white/70 py-2.5 text-sm font-bold text-[#6f2b50] transition active:scale-95 sm:py-3"
              >
                Share
              </button>

              {shareNotice && (
                <p className="text-xs font-bold text-[#7a4560]">{shareNotice}</p>
              )}

              <button
                type="button"
                onClick={onExitToHome}
                className="text-sm font-bold text-[#a0627a] underline underline-offset-4"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
