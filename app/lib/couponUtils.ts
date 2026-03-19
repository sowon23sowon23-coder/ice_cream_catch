// Alphanumeric alphabet excluding visually confusing chars (0, O, I, 1, L)
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_LENGTH = 8;

// generateCouponCode is server-only — uses dynamic require to avoid
// bundling Node's `crypto` into the client-side bundle.
export function generateCouponCode(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { randomBytes } = require("crypto") as { randomBytes: (n: number) => Buffer };
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

export interface ScoreTier {
  minScore: number;
  discountAmount: number; // in KRW (e.g. 3000 = ₩3,000)
  label: string;
  expiryDays: number;
}

export const SCORE_TIERS: ScoreTier[] = [
  { minScore: 90, discountAmount: 3000, label: "3,000원 할인", expiryDays: 30 },
  { minScore: 70, discountAmount: 2000, label: "2,000원 할인", expiryDays: 30 },
  { minScore: 50, discountAmount: 1000, label: "1,000원 할인", expiryDays: 30 },
];

export const MIN_SCORE_FOR_COUPON = SCORE_TIERS[SCORE_TIERS.length - 1].minScore;

export function getScoreTier(score: number): ScoreTier | null {
  for (const tier of SCORE_TIERS) {
    if (score >= tier.minScore) return tier;
  }
  return null;
}

export function formatDiscount(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export function getExpiresAt(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function isCouponExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}
