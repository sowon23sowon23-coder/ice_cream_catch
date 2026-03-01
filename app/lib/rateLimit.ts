type Bucket = {
  timestamps: number[];
};

const buckets = new Map<string, Bucket>();

export function enforceRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  const bucket = buckets.get(key) ?? { timestamps: [] };
  const recent = bucket.timestamps.filter((ts) => ts > windowStart);

  if (recent.length >= limit) {
    buckets.set(key, { timestamps: recent });
    return false;
  }

  recent.push(now);
  buckets.set(key, { timestamps: recent });
  return true;
}

