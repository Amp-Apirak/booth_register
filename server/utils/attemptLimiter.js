/**
 * Counts failed attempts per key in memory (the API runs as one instance) and blocks the key for
 * the rest of the window after `max` failures. Used for staff login and the public ticket lookup.
 */
class AttemptLimiter {
  constructor({ max, windowMs }) {
    this.max = max;
    this.windowMs = windowMs;
    this.entries = new Map();
  }

  entry(key, now) {
    const e = this.entries.get(key);
    if (!e || now - e.start > this.windowMs) return null;
    return e;
  }

  /** seconds until the key may try again (0 = allowed now) */
  retryAfterSeconds(key, now = Date.now()) {
    const e = this.entry(key, now);
    if (!e || e.count < this.max) return 0;
    return Math.max(1, Math.ceil((e.start + this.windowMs - now) / 1000));
  }

  fail(key, now = Date.now()) {
    const e = this.entry(key, now);
    if (e) e.count += 1;
    else this.entries.set(key, { count: 1, start: now });
    if (this.entries.size > 5000) {
      for (const [k, v] of this.entries) if (now - v.start > this.windowMs) this.entries.delete(k);
    }
  }

  reset(key) {
    this.entries.delete(key);
  }
}

module.exports = { AttemptLimiter };
