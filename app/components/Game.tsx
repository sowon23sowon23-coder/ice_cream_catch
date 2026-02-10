"use client";

import { useEffect, useRef, useState } from "react";

type CharId = "green" | "berry" | "sprinkle";

type Ice = { id: number; x: number; y: number; v: number };
type Pop = { id: number; x: number; y: number; text: string; born: number };

export default function Game({
  character,
  startSignal,
  onExitToHome,
  onBestScore,
  onGameOver,
}: {
  character: CharId;
  startSignal: number;
  onExitToHome: () => void;
  onBestScore: (best: number) => void;
  onGameOver?: (finalScore: number) => void; // ✅ 안전: optional
}) {
  const [phase, setPhase] = useState<"idle" | "play" | "over">("idle");
  const [countdown, setCountdown] = useState<"ready" | "go" | null>(null);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [playerX, setPlayerX] = useState(50);

  const [ices, setIces] = useState<Ice[]>([]);
  const [pops, setPops] = useState<Pop[]>([]);

  const [tilt, setTilt] = useState(0);
  const [bounce, setBounce] = useState(false);
  const [shake, setShake] = useState(false);

  const areaRef = useRef<HTMLDivElement>(null);

  const idRef = useRef(0);
  const popIdRef = useRef(0);
  const lastLifeLossRef = useRef(0);

  const spawnRef = useRef<number | null>(null);
  const loopRef = useRef<number | null>(null);

  const playerXRef = useRef(50);
  useEffect(() => {
    playerXRef.current = playerX;
  }, [playerX]);

  const gameOverFiredRef = useRef(false);

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

  const start = () => {
    // reset refs
    idRef.current = 0;
    popIdRef.current = 0;
    lastLifeLossRef.current = 0;
    playerXRef.current = 50;
    gameOverFiredRef.current = false;

    // reset state
    setScore(0);
    setLives(3);
    setPlayerX(50);
    setIces([]);
    setPops([]);
    setTilt(0);
    setBounce(false);
    setShake(false);

    // READY/GO 연출
    setCountdown("ready");
    setPhase("idle");

    window.setTimeout(() => setCountdown("go"), 450);
    window.setTimeout(() => {
      setCountdown(null);
      setPhase("play");
    }, 900);
  };

  // ✅ 홈에서 Start 눌러서 game 진입하면 즉시 start
  useEffect(() => {
    if (!startSignal) return;
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSignal]);

  const PLAYER_W = 80;

  const move = (clientX: number) => {
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

  // ✅ 게임오버 처리 (딱 1번만)
  useEffect(() => {
    if (phase !== "play") return;
    if (lives > 0) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lives, phase, score]);

  // ✅ 스폰/루프
  useEffect(() => {
    if (phase !== "play") {
      stopAll();
      return;
    }
    if (loopRef.current !== null) return;

    spawnRef.current = window.setInterval(() => {
      setIces((v) => [
        ...v,
        {
          id: idRef.current++,
          x: Math.random() * 90 + 5,
          y: -5,
          v: 1.2 + Math.random() * 2.4,
        },
      ]);
    }, 900);

    loopRef.current = window.setInterval(() => {
      const now = performance.now();
      const px = playerXRef.current;

      setIces((prev) => {
        let gained = 0;
        let missed = 0;
        const popsToAdd: Pop[] = [];
        const next: Ice[] = [];

        for (const i of prev) {
          const ny = i.y + i.v;

          // catch
          if (Math.abs(i.x - px) < 8 && ny > 85) {
            gained += 1;
            popsToAdd.push({
              id: popIdRef.current++,
              x: i.x,
              y: 88,
              text: "+1",
              born: now,
            });
            continue;
          }

          // miss
          if (ny > 105) {
            missed += 1;
            continue;
          }

          next.push({ ...i, y: ny });
        }

        if (gained) setScore((s) => s + gained);

        if (missed) {
          const now2 = performance.now();
          if (now2 - lastLifeLossRef.current >= 400) {
            lastLifeLossRef.current = now2;

            // 💔 팝업
            setPops((ps) =>
              ps.concat([
                {
                  id: popIdRef.current++,
                  x: playerXRef.current,
                  y: 90,
                  text: "💔",
                  born: now2,
                },
              ])
            );

            // 화면 흔들림
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
  }, [phase]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-100 to-blue-100 flex items-center justify-center p-4">
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
      `}</style>

      <div className="w-full max-w-md">
        <div className="text-center mb-4 font-bold text-pink-600">
          🍦 Score {score} &nbsp; ❤️ {lives}
        </div>

        <div
          ref={areaRef}
          onMouseMove={(e) => phase === "play" && move(e.clientX)}
          onTouchMove={(e) => phase === "play" && move(e.touches[0].clientX)}
          className={`relative aspect-[3/4] rounded-3xl bg-sky-200 overflow-hidden shadow-xl ${
            shake ? "animate-shake" : ""
          }`}
        >
          {/* READY / GO */}
          {countdown && (
            <div className="absolute inset-0 z-30 flex items-center justify-center">
              <div className="px-8 py-4 rounded-3xl bg-white/75 backdrop-blur-md border border-black/5 shadow-2xl">
                <div className="text-4xl font-black text-pink-600 text-center">
                  {countdown === "ready" ? "READY" : "GO!"}
                </div>
              </div>
            </div>
          )}

          {/* OVERLAY (idle/over) */}
          {phase !== "play" && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/55 backdrop-blur-sm">
              <div className="text-5xl mb-3">{phase === "over" ? "😢" : "🍦"}</div>

              <div className="text-xl font-extrabold text-pink-600 mb-2">
                {phase === "over" ? "Game Over!" : "Loading…"}
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
                    Your Score:{" "}
                    <span className="font-black text-pink-600">{score}</span>
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
                    onClick={onExitToHome}
                    className="mt-3 text-sm font-bold text-pink-700/80 underline underline-offset-4"
                  >
                    Back to Home
                  </button>
                </>
              )}
            </div>
          )}

          {/* FALLING */}
          {ices.map((i) => (
            <div key={i.id} style={{ left: `${i.x}%`, top: `${i.y}%` }} className="absolute text-4xl">
              🍦
            </div>
          ))}

          {/* POPS */}
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

          {/* PLAYER */}
          {phase === "play" && (
            <div
              className="absolute bottom-0"
              style={{
                left: `${playerX}%`,
                transform: "translateX(-50%)",
                width: 96,
                height: 96,
              }}
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
