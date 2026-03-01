"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ContactType = "phone" | "email";

type EntryResponse = {
  entryId: number;
  entryCode: string;
  isNew: boolean;
};

export default function EntryPage() {
  const router = useRouter();
  const [contactType, setContactType] = useState<ContactType>("phone");
  const [contactValue, setContactValue] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);

  const cooldownLeft = useMemo(() => {
    if (!cooldownUntil) return 0;
    return Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
  }, [cooldownUntil, loading, contactType, contactValue, consent]);

  const placeholder =
    contactType === "phone" ? "e.g. (555) 123-4567 or +1 555 123 4567" : "e.g. you@example.com";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    if (cooldownUntil && cooldownUntil > Date.now()) {
      setError(`Please wait ${cooldownLeft}s before trying again.`);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactType,
          contactValue,
          consent,
        }),
      });

      const json = (await res.json()) as Partial<EntryResponse> & { error?: string };
      if (!res.ok) {
        setError(json.error || "Failed to submit entry.");
        return;
      }

      const message = json.isNew
        ? `You're in! Entry Code: ${json.entryCode}`
        : `This contact is already entered. Entry Code: ${json.entryCode}`;
      setSuccessMessage(message);
      setCooldownUntil(Date.now() + 25_000);
      window.setTimeout(() => router.push("/game"), 600);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_15%_5%,#ffffff_0%,#ffeef8_35%,#f8d5e8_100%)] p-4 sm:p-6">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-[var(--yl-card-border)] bg-white/95 p-5 shadow-[0_24px_56px_rgba(150,9,83,0.2)]">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--yl-primary)]">Giveaway Entry</p>
        <h1 className="mt-1 text-3xl font-black text-[var(--yl-ink-strong)]">Enter & Start</h1>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--yl-card-border)] bg-[var(--yl-card-bg)] p-1">
            <button
              type="button"
              onClick={() => setContactType("phone")}
              className={`rounded-xl px-3 py-2 text-sm font-black ${
                contactType === "phone"
                  ? "bg-[var(--yl-primary)] text-white"
                  : "bg-white text-[var(--yl-primary)]"
              }`}
            >
              US Phone
            </button>
            <button
              type="button"
              onClick={() => setContactType("email")}
              className={`rounded-xl px-3 py-2 text-sm font-black ${
                contactType === "email"
                  ? "bg-[var(--yl-primary)] text-white"
                  : "bg-white text-[var(--yl-primary)]"
              }`}
            >
              Email
            </button>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-[var(--yl-ink-strong)]">
              {contactType === "phone" ? "US phone number" : "Email"}
            </span>
            <input
              value={contactValue}
              onChange={(e) => setContactValue(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-xl border border-[var(--yl-card-border)] bg-white px-3 py-3 text-sm font-semibold text-[var(--yl-ink-strong)] outline-none focus:border-[var(--yl-primary)]"
              required
              inputMode={contactType === "phone" ? "tel" : "email"}
              autoComplete={contactType === "phone" ? "tel" : "email"}
            />
          </label>

          <label className="flex items-start gap-2 rounded-xl border border-[var(--yl-card-border)] bg-[var(--yl-card-bg)] p-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
            />
            <span className="font-semibold text-[var(--yl-ink-muted)]">
              I agree to the collection and use of my contact for entry identification and digital coupon delivery.
              Data will be deleted within 30 days after coupon delivery is completed.
            </span>
          </label>

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p>}
          {successMessage && (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{successMessage}</p>
          )}

          <button
            type="submit"
            disabled={loading || (cooldownUntil !== null && cooldownUntil > Date.now())}
            className="w-full rounded-xl bg-[var(--yl-primary)] px-4 py-3 text-sm font-black text-white disabled:opacity-60"
          >
            {loading ? "Submitting..." : "Enter & Start"}
          </button>
        </form>
      </div>
    </main>
  );
}

