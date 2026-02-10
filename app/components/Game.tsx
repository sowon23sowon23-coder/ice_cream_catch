'use client';

import { useEffect, useRef, useState } from 'react';

type Ice = { id: number; x: number; y: number; v: number };
type Pop = { id: number; x: number; y: number; text: string; born: number };

export default function Game() {
  const [phase, setPhase] = useState<'idle' | 'play' | 'over'>('idle');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [playerX, setPlayerX] = useState(50);
  const [ices, setIces] = useState<Ice[]>([]);
  const [pops, setPops] = useState<Pop[]>([]);

  const [character, setCharacter] = useState<'green' | 'berry' | 'sprinkle'>('green');


  const [tilt, setTilt] = useState(0);
const [bounce, setBounce] = useState(false);

  const areaRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);
  const popIdRef = useRef(0);
  const lastLifeLossRef = useRef(0);

  const [shake, setShake] = useState(false);  //미스 시 💔 팝업 + 화면 살짝 흔들림 //

  const playerXRef = useRef(50);
  useEffect(() => {
    playerXRef.current = playerX;
  }, [playerX]);

  const spawnRef = useRef<number | null>(null);
  const loopRef = useRef<number | null>(null);

  useEffect(() => {
    // 정리 함수
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

    if (phase !== 'play') {
      stopAll();
      return;
    }

    if (loopRef.current !== null) return;

    spawnRef.current = window.setInterval(() => {
      setIces(v => [
        ...v,
        { id: idRef.current++, x: Math.random() * 90 + 5, y: -5, v: 1.2 + Math.random() * 2.4 },
      ]);
    }, 900);

    loopRef.current = window.setInterval(() => {
  const now = performance.now();
  const px = playerXRef.current;

  setIces(prev => {
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
          text: '+2',
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

    // ✅ 여기서 "한 번만" score/lives/pops 업데이트
    if (gained) setScore(s => s + 1); //틱당 +1 만

    if (missed) {
       const now2 = performance.now();
  if (now2 - lastLifeLossRef.current >= 400) { // 0.4초 쿨타임
    lastLifeLossRef.current = now2;
// 💔 팝업 생성
setPops(ps =>
  ps.concat([{
    id: popIdRef.current++,
    x: playerXRef.current,
    y: 90,
    text: '💔',
    born: now2,

    
  }])
);
// 화면 흔들기
setShake(true);
setTimeout(() => setShake(false), 180);
    setLives(l => {
      const nl = l - 1;
      if (nl <= 0) {
        setPhase('over');
        return 0;
      }
      return nl;
    });
  }
}

setPops(ps => ps.concat(popsToAdd.slice(0,1)).filter(p => now - p.born < 700));

    return next;
  });
}, 30);


    return stopAll;
  }, [phase]);

  const start = () => {

       idRef.current = 0;
popIdRef.current = 0;
playerXRef.current = 50;

    setScore(0);
    setLives(3);
    setPlayerX(50);
    setIces([]);
    setPops([]);
    setPhase('play');
 
  };
const PLAYER_W = 80;

  const move = (clientX: number) => {
    const r = areaRef.current?.getBoundingClientRect();
    if (!r) return;

    const xPx = clientX - r.left; // 0 ~ width
  const clamped = Math.max(PLAYER_W / 2, Math.min(r.width - PLAYER_W / 2, xPx));
  const pct = (clamped / r.width) * 100;

  setPlayerX(pct);
  setTilt((pct - 50) / 10); // -5 ~ +5 정도
  setBounce(true);
setTimeout(() => setBounce(false), 140);
};

  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-100 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-4 font-bold text-pink-600">
          🍦 Score {score} &nbsp; ❤️ {lives}
        </div>

        <div
          ref={areaRef}
          onMouseMove={e => phase === 'play' && move(e.clientX)}
          onTouchMove={e => phase === 'play' && move(e.touches[0].clientX)}
className={`relative aspect-[3/4] rounded-3xl bg-sky-200 overflow-hidden shadow-xl ${shake ? 'animate-shake' : ''}`}        >
         {phase !== 'play' && (
  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/55 backdrop-blur-sm">
    <div className="text-5xl mb-3">{phase === 'over' ? '😢' : '🍦'}</div>

    <div className="text-xl font-extrabold text-pink-600 mb-2">
      {phase === 'over' ? 'Try again!' : 'Choose your character'}

      
    </div>


    {/* 캐릭터 선택 */}
    <div className="flex gap-4 mb-6">
      {(['green', 'berry', 'sprinkle'] as const).map(c => (
        <button
          key={c}
          type="button"
          onClick={() => setCharacter(c)}
         className={`rounded-2xl p-2 transition active:scale-95 ${
  character === c
    ? 'ring-4 ring-pink-400 bg-white scale-110'
    : 'bg-white/70'
}`}
        >
          <img
            src={`/${c}.png`}
            alt={c}
            className="w-16 h-16 select-none pointer-events-none"
            draggable={false}
          />
        </button>
      ))}
    </div>

    {/* Start / Retry */}
    <button
      type="button"
      onClick={start}
   
      className="px-10 py-4 rounded-full bg-pink-500 text-white font-extrabold shadow-lg active:scale-95 transition"
    >
      {phase === 'over' ? 'Retry' : 'Start'}
    </button>

    {phase !== 'over' && (
      <div className="mt-3 text-sm text-pink-600/80">Tap Start to play</div>
    )}
  </div>
)}
          

          {ices.map(i => (
            <div key={i.id} style={{ left: `${i.x}%`, top: `${i.y}%` }} className="absolute text-4xl">
              🍦
            </div>
          ))}

          {pops.map(p => {
            const age = (performance.now() - p.born) / 1000;
            const opacity = Math.max(0, 1 - age / 0.7);
            const rise = Math.min(12, age * 20);
            const scale = 1 + Math.min(0.25, age * 0.6);

            

            return (
              <div
                key={p.id}
                className="absolute font-extrabold text-pink-600 pointer-events-none select-none"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y - rise}%`,
                transform: `translateX(-50%) rotate(${tilt}deg) scale(${bounce ? 1.08 : 1})`,
                transition: 'transform 120ms ease',
                  textShadow: '0 2px 10px rgba(0,0,0,0.12)',
                }}
              >
                {p.text}
              </div>
            );
          })}


          {phase === 'play' && (
  <div
    className="absolute bottom-0"
    style={{
      left: `${playerX}%`,
      transform: 'translateX(-50%)',
      width: 96,
      height: 96,
    }}
  >
    <img
      src={`/${character}.png`}
      alt="character"
      width={64}
      height={64}
      draggable={false}
      className="w-24" //작게 → w-16 크게 → w-24 //
      
    />
  </div>
          )}
        </div>
      </div>
    </main>
  );
}
