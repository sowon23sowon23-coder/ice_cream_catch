"use client";

import { useEffect, useState } from "react";
import StoreCombobox from "./StoreCombobox";

export default function LoginScreen({
  initialNickname = "",
  stores,
  selectedStore,
  onStoreChange,
  onLogin,
  loading = false,
}: {
  initialNickname?: string;
  stores: string[];
  selectedStore: string;
  onStoreChange: (store: string) => void;
  onLogin: (nickname: string) => void;
  loading?: boolean;
}) {
  const [nickname, setNickname] = useState(initialNickname);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [storeError, setStoreError] = useState<string | null>(null);

  useEffect(() => {
    setNickname(initialNickname);
  }, [initialNickname]);

  const submit = () => {
    const trimmed = nickname.trim();
    if (trimmed.length < 2 || trimmed.length > 12) {
      setNicknameError("Nickname must be 2-12 characters.");
      return;
    }
    if (!selectedStore.trim()) {
      setStoreError("Please select a store.");
      return;
    }
    setNicknameError(null);
    setStoreError(null);
    onLogin(trimmed);
  };

  return (
    <main className="flex min-h-[70vh] items-center p-5">
      <div className="mx-auto w-full max-w-sm">
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
            onChange={(e) => {
              setNickname(e.target.value);
              if (nicknameError) setNicknameError(null);
            }}
            maxLength={12}
            placeholder="2-12 characters"
            className="mt-1 w-full rounded-xl border border-[#f3bdd8] bg-[#fff9fc] px-3 py-2 text-sm font-semibold text-[#4b0f31] outline-none focus:border-[#960953]"
          />
          {nicknameError ? <p className="mt-2 text-xs font-bold text-[#c13f63]">{nicknameError}</p> : null}

          <label htmlFor="login-store" className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-[#960953]">
            Store
          </label>
          <StoreCombobox
            stores={stores}
            value={selectedStore}
            onChange={(store) => {
              onStoreChange(store);
              if (store) setStoreError(null);
            }}
            placeholder="Search store…"
            wrapperClassName="mt-1"
            inputClassName="w-full rounded-xl border border-[#f3bdd8] bg-[#fff9fc] px-3 py-2 text-sm font-semibold text-[#4b0f31] outline-none focus:border-[#960953]"
          />
          {storeError ? <p className="mt-1 text-xs font-bold text-[#c13f63]">{storeError}</p> : null}

          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-[linear-gradient(135deg,#960953,#c54b86)] px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_14px_24px_rgba(150,9,83,0.35)] transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {loading ? "Checking..." : "Login"}
          </button>
        </section>
      </div>
    </main>
  );
}
