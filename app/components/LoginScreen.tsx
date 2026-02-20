"use client";

import { useState } from "react";

export default function LoginScreen({
  initialNickname = "",
  onLogin,
}: {
  initialNickname?: string;
  onLogin: (nickname: string) => void;
}) {
  const [nickname, setNickname] = useState(initialNickname);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const trimmed = nickname.trim();
    if (trimmed.length < 2 || trimmed.length > 12) {
      setError("Nickname must be 2-12 characters.");
      return;
    }
    setError(null);
    onLogin(trimmed);
  };

  return (
    <main className="relative h-full overflow-hidden bg-[radial-gradient(circle_at_12%_8%,#ffffff_0%,#ffedf7_36%,#f9d3e7_100%)] p-5">
      <div className="pointer-events-none absolute -right-14 -top-14 h-56 w-56 rounded-full bg-white/70 blur-2xl" />
      <div className="pointer-events-none absolute -left-14 bottom-10 h-44 w-44 rounded-full bg-[#9ee86b]/30 blur-2xl" />

      <div className="relative z-10 mx-auto flex h-full max-w-sm items-center">
        <section className="w-full rounded-3xl border border-[#f8d2e4] bg-white/92 p-6 shadow-[0_16px_40px_rgba(150,9,83,0.16)] backdrop-blur-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#960953]">Yogurtland</p>
          <h1 className="mt-1 text-3xl font-black leading-[1.08] text-[#4b0b31]">Ice Cream Catcher</h1>
          <p className="mt-2 text-sm font-semibold text-[#72425f]">Start by logging in with your nickname.</p>

          <label htmlFor="login-nickname" className="mt-5 block text-xs font-black uppercase tracking-[0.14em] text-[#960953]">
            Nickname
          </label>
          <input
            id="login-nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={12}
            placeholder="2-12 characters"
            className="mt-1 w-full rounded-xl border border-[#f3bdd8] bg-[#fff9fc] px-3 py-2 text-sm font-semibold text-[#4b0f31] outline-none focus:border-[#960953]"
          />
          {error ? <p className="mt-2 text-xs font-bold text-[#c13f63]">{error}</p> : null}

          <button
            type="button"
            onClick={submit}
            className="mt-4 w-full rounded-xl bg-[linear-gradient(135deg,#960953,#c54b86)] px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_14px_24px_rgba(150,9,83,0.35)] transition hover:-translate-y-0.5"
          >
            Login
          </button>
        </section>
      </div>
    </main>
  );
}
