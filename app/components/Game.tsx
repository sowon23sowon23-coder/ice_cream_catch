"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

type CharId = "green" | "berry" | "sprinkle";
type GameMode = "free" | "mission" | "timeAttack";

const MISSION_TOPPINGS = ["🍒", "🍓", "🥄", "🫐", "🍫"] as const;
type MissionTopping = (typeof MISSION_TOPPINGS)[number];
type FallingEmoji = "🍨" | MissionTopping;

type FallingItem = { id: number; x: number; y: number; v: number; emoji: FallingEmoji };
type Pop = { id: number; x: number; y: number; text: string; born: number };

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

function randomMissionTargets() {
  const count = Math.floor(Math.random() * 4) + 2; // 2..5
  const shuffled = [...MISSION_TOPPINGS].sort(() => Math.random() - 0.5);
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
  const [timeLeft, setTimeLeft] = useState(30);
  const [difficultyLevel, setDifficultyLevel] = useState(0);
  const [difficultyNotice, setDifficultyNotice] = useState<string | null>(null);
  const [fanfareNotice, setFanfareNotice] = useState(false);
  const [fireworkSeed, setFireworkSeed] = useState(0);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [playerX, setPlayerX] = useState(50);
  const [missionTargets, setMissionTargets] = useState<MissionTopping[]>([]);

  const [items, setItems] = useState<FallingItem[]>([]);
  const [pops, setPops] = useState<Pop[]>([]);

  const [tilt, setTilt] = useState(0);
  const [bounce, setBounce] = useState(false);
  const [shake, setShake] = useState(false);
  const [gameBg, setGameBg] = useState<string | null>(null);

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
  const fanfareShownRef = useRef(false);
  const pausedRef = useRef(false);

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

    const best = Number(localStorage.getItem("bestScore") || 0);
    if (score > best) {
      localStorage.setItem("bestScore", String(score));
      onBestScore(score);
    }

    onGameOver?.(score);
  };

  const start = () => {
    idRef.current = 0;
    popIdRef.current = 0;
    lastLifeLossRef.current = 0;
    playerXRef.current = 50;
    gameOverFiredRef.current = false;

    setScore(0);
    setLives(3);
    setTimeLeft(30);
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
    fanfareShownRef.current = false;

    if (mode === "mission") {
      setMissionTargets(randomMissionTargets());
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
    if (score < 10 || fanfareShownRef.current) return;

    fanfareShownRef.current = true;
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
      const emoji: FallingEmoji =
        mode === "mission"
          ? MISSION_TOPPINGS[Math.floor(Math.random() * MISSION_TOPPINGS.length)]
          : "🍨";

      setItems((v) => [
        ...v,
        { id: idRef.current++, x: Math.random() * 90 + 5, y: -5, v: 1.2 + Math.random() * 2.4, emoji },
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
          const isMissionTarget = missionSet.has(item.emoji as MissionTopping);

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
  }, [phase, mode, missionSet]);

  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-pink-100 to-blue-100 flex items-center justify-center p-4">
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
            Catch only: {missionTargets.join(" ")}
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
                    <div className="text-3xl font-black text-amber-600">{missionTargets.join(" ")}</div>
                  </>
                ) : (
                  <div className="text-4xl font-black text-pink-600">
                    {countdown === "ready" ? "READY" : "GO!"}
                  </div>
                )}
              </div>
            </div>
          )}

          {phase !== "play" && (
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
              className="absolute text-4xl"
            >
              {item.emoji}
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
    </main>
  );
}
