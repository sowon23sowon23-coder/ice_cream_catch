"use client";

import { useEffect, useState } from "react";

type ContactType = "phone" | "email";

type EntryResponse = {
  entryId: number;
  entryCode: string;
  isNew: boolean;
  error?: string;
};

export default function LoginScreen({
  initialNickname = "",
  onLogin,
  onDeleteNickname,
  loading = false,
}: {
  initialNickname?: string;
  onLogin: (nickname: string) => void | Promise<void>;
  onDeleteNickname?: () => void;
  loading?: boolean;
}) {
  const [nickname, setNickname] = useState(initialNickname);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [contactEnabled, setContactEnabled] = useState(false);
  const [contactType, setContactType] = useState<ContactType>("phone");
  const [contactValue, setContactValue] = useState("");
  const [contactConsent, setContactConsent] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [entryCode, setEntryCode] = useState<string | null>(null);

  useEffect(() => {
    setNickname(initialNickname);
  }, [initialNickname]);

  const submit = async () => {
    const trimmed = nickname.trim();
    if (trimmed.length < 2 || trimmed.length > 12) {
      setNicknameError("Nickname must be 2-12 characters.");
      return;
    }

    setNicknameError(null);
    setContactError(null);

    if (contactEnabled) {
      if (!contactValue.trim()) {
        setContactError(contactType === "phone" ? "Enter a US phone number." : "Enter an email address.");
        return;
      }
      if (!contactConsent) {
        setContactError("Consent is required for phone/email login.");
        return;
      }

      try {
        const res = await fetch("/api/entry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactType,
            contactValue,
            consent: true,
          }),
        });

        const json = (await res.json()) as Partial<EntryResponse> & { error?: string };
        if (!res.ok) {
          setContactError(json.error || "Failed to verify phone/email.");
          return;
        }

        setEntryCode(json.entryCode ?? null);
      } catch {
        setContactError("Network error while checking phone/email.");
        return;
      }
    }

    await onLogin(trimmed);
  };

  const clearNickname = () => {
    setNickname("");
    setNicknameError(null);
    onDeleteNickname?.();
  };

  return (
    <main className="flex min-h-[70vh] items-center p-5">
      <div className="mx-auto w-full max-w-sm">
        <section className="w-full rounded-3xl border border-[var(--yl-card-border)] bg-white/92 p-6 shadow-[0_16px_40px_rgba(150,9,83,0.16)] backdrop-blur-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--yl-primary)]">Yogurtland</p>
          <h1 className="mt-1 text-3xl font-black leading-[1.08] text-[var(--yl-ink-strong)]">Ice Cream Catcher</h1>
          <p className="mt-2 text-base font-semibold text-[var(--yl-ink-muted)]">
            Log in with your nickname. Phone or email login is also available again.
          </p>

          <label
            htmlFor="login-nickname"
            className="mt-5 block text-sm font-black uppercase tracking-[0.1em] text-[var(--yl-primary)]"
          >
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
            className="mt-1 w-full rounded-xl border border-[var(--yl-card-border)] bg-[#fff9fc] px-3 py-2 text-base font-semibold text-[var(--yl-ink-strong)] outline-none focus:border-[var(--yl-primary)]"
          />
          {(nickname.trim().length > 0 || initialNickname.trim().length > 0) && (
            <button
              type="button"
              onClick={clearNickname}
              className="mt-2 text-sm font-black text-[var(--yl-primary-soft)] underline underline-offset-4"
            >
              Delete saved nickname
            </button>
          )}
          {nicknameError ? <p className="mt-2 text-sm font-bold text-[var(--yl-primary-soft)]">{nicknameError}</p> : null}

          <div className="mt-5 rounded-2xl border border-[var(--yl-card-border)] bg-[var(--yl-card-bg)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.1em] text-[var(--yl-primary)]">Phone / Email Login</p>
                <p className="mt-1 text-xs font-semibold text-[var(--yl-ink-muted)]">
                  Optional. Use a US phone number or email to restore contact-based login.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setContactEnabled((prev) => !prev);
                  setContactError(null);
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-black ${
                  contactEnabled ? "bg-[var(--yl-primary)] text-white" : "bg-white text-[var(--yl-primary)]"
                }`}
              >
                {contactEnabled ? "Enabled" : "Off"}
              </button>
            </div>

            {contactEnabled && (
              <div className="mt-4">
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--yl-card-border)] bg-white p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setContactType("phone");
                      setContactError(null);
                    }}
                    className={`rounded-xl px-3 py-2 text-sm font-black ${
                      contactType === "phone" ? "bg-[var(--yl-primary)] text-white" : "text-[var(--yl-primary)]"
                    }`}
                  >
                    US Phone
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setContactType("email");
                      setContactError(null);
                    }}
                    className={`rounded-xl px-3 py-2 text-sm font-black ${
                      contactType === "email" ? "bg-[var(--yl-primary)] text-white" : "text-[var(--yl-primary)]"
                    }`}
                  >
                    Email
                  </button>
                </div>

                <input
                  value={contactValue}
                  onChange={(e) => {
                    setContactValue(e.target.value);
                    if (contactError) setContactError(null);
                  }}
                  placeholder={contactType === "phone" ? "e.g. (555) 123-4567" : "e.g. you@example.com"}
                  inputMode={contactType === "phone" ? "tel" : "email"}
                  autoComplete={contactType === "phone" ? "tel" : "email"}
                  className="mt-3 w-full rounded-xl border border-[var(--yl-card-border)] bg-white px-3 py-2 text-base font-semibold text-[var(--yl-ink-strong)] outline-none focus:border-[var(--yl-primary)]"
                />

                <label className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--yl-card-border)] bg-white p-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4"
                    checked={contactConsent}
                    onChange={(e) => {
                      setContactConsent(e.target.checked);
                      if (contactError) setContactError(null);
                    }}
                  />
                  <span className="font-semibold text-[var(--yl-ink-muted)]">
                    I agree to the collection and use of my contact for entry identification and digital coupon delivery.
                  </span>
                </label>

                {entryCode ? (
                  <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                    Entry restored: {entryCode}
                  </p>
                ) : null}
                {contactError ? (
                  <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{contactError}</p>
                ) : null}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => void submit()}
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-[linear-gradient(135deg,var(--yl-primary),var(--yl-primary-soft))] px-4 py-3 text-base font-black uppercase tracking-[0.1em] text-white shadow-[0_14px_24px_rgba(150,9,83,0.35)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--yl-focus-ring)] disabled:opacity-60"
          >
            {loading ? "Checking..." : "Login"}
          </button>
        </section>
      </div>
    </main>
  );
}
