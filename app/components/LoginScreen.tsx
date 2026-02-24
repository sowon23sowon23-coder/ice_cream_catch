"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import StoreCombobox from "./StoreCombobox";

export default function LoginScreen({
  initialNickname = "",
  stores,
  selectedStore,
  onStoreChange,
  onLogin,
  onDeleteNickname,
  loading = false,
}: {
  initialNickname?: string;
  stores: string[];
  selectedStore: string;
  onStoreChange: (store: string) => void;
  onLogin: (nickname: string) => void;
  onDeleteNickname?: () => void;
  loading?: boolean;
}) {
  const [nickname, setNickname] = useState(initialNickname);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [lockedStore, setLockedStore] = useState<string | null>(null);
  const [checkingStore, setCheckingStore] = useState(false);
  const lastCheckedNick = useRef<string>("");

  useEffect(() => {
    setNickname(initialNickname);
  }, [initialNickname]);

  // When initialNickname is pre-filled (returning user), look up their store immediately.
  useEffect(() => {
    if (!initialNickname || initialNickname.trim().length < 2) return;
    void lookupStore(initialNickname.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNickname]);

  const lookupStore = async (trimmed: string) => {
    if (lastCheckedNick.current === trimmed) return;
    lastCheckedNick.current = trimmed;

    setCheckingStore(true);
    try {
      const key = trimmed.toLowerCase();
      const { data } = await supabase
        .from("leaderboard_best_v2")
        .select("store")
        .eq("nickname_key", key)
        .not("store", "is", null)
        .order("updated_at", { ascending: false })
        .limit(1);

      const dbStore = (data?.[0] as { store?: string } | undefined)?.store?.trim();
      if (dbStore && dbStore !== "__ALL__" && stores.includes(dbStore)) {
        setLockedStore(dbStore);
        onStoreChange(dbStore);
      } else {
        setLockedStore(null);
      }
    } catch {
      setLockedStore(null);
    } finally {
      setCheckingStore(false);
    }
  };

  const handleNicknameBlur = () => {
    const trimmed = nickname.trim();
    if (trimmed.length >= 2) {
      void lookupStore(trimmed);
    } else {
      setLockedStore(null);
      lastCheckedNick.current = "";
    }
  };

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

  const clearNickname = () => {
    setNickname("");
    setNicknameError(null);
    setStoreError(null);
    setLockedStore(null);
    lastCheckedNick.current = "";
    onDeleteNickname?.();
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
              // Reset lock when user types a new nickname
              setLockedStore(null);
              lastCheckedNick.current = "";
            }}
            onBlur={handleNicknameBlur}
            maxLength={12}
            placeholder="2-12 characters"
            className="mt-1 w-full rounded-xl border border-[#f3bdd8] bg-[#fff9fc] px-3 py-2 text-sm font-semibold text-[#4b0f31] outline-none focus:border-[#960953]"
          />
          {(nickname.trim().length > 0 || initialNickname.trim().length > 0) && (
            <button
              type="button"
              onClick={clearNickname}
              className="mt-2 text-xs font-black text-[#b23a67] underline underline-offset-4"
            >
              Delete saved nickname
            </button>
          )}
          {nicknameError ? <p className="mt-2 text-xs font-bold text-[#c13f63]">{nicknameError}</p> : null}

          <label htmlFor="login-store" className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-[#960953]">
            Store
            {checkingStore && (
              <span className="ml-2 text-[10px] font-semibold normal-case text-[#a07090]">Checking...</span>
            )}
            {lockedStore && (
              <span className="ml-2 text-[10px] font-semibold normal-case text-[#c13f63]">Locked</span>
            )}
          </label>
          <StoreCombobox
            stores={stores}
            value={selectedStore}
            onChange={(store) => {
              if (lockedStore) return; // prevent change when locked
              onStoreChange(store);
              if (store) setStoreError(null);
            }}
            disabled={!!lockedStore}
            placeholder="Search store..."
            wrapperClassName="mt-1"
            inputClassName={`w-full rounded-xl border px-3 py-2 text-sm font-semibold text-[#4b0f31] outline-none transition ${
              lockedStore
                ? "border-[#f3bdd8] bg-[#fff0f7] text-[#a06080] cursor-not-allowed"
                : "border-[#f3bdd8] bg-[#fff9fc] focus:border-[#960953]"
            }`}
          />
          {lockedStore ? (
            <p className="mt-1 text-xs font-semibold text-[#a07090]">
              This nickname is already registered to a store. To change stores, delete the nickname and register
              again.
            </p>
          ) : storeError ? (
            <p className="mt-1 text-xs font-bold text-[#c13f63]">{storeError}</p>
          ) : null}

          <button
            type="button"
            onClick={submit}
            disabled={loading || checkingStore}
            className="mt-4 w-full rounded-xl bg-[linear-gradient(135deg,#960953,#c54b86)] px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_14px_24px_rgba(150,9,83,0.35)] transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {loading ? "Checking..." : "Login"}
          </button>
        </section>
      </div>
    </main>
  );
}


