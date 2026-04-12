/**
 * In-memory Redis mock for local development.
 * Implements only the commands used in this project.
 */

type Entry = { value: unknown; expiresAt?: number };

class MemoryStore {
  private store = new Map<string, Entry>();

  private expired(key: string): boolean {
    const e = this.store.get(key);
    if (!e) return false;
    if (e.expiresAt && Date.now() > e.expiresAt) {
      this.store.delete(key);
      return true;
    }
    return false;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    if (this.expired(key)) return null;
    return (this.store.get(key)?.value ?? null) as T | null;
  }

  async set(
    key: string,
    value: unknown,
    opts?: { ex?: number; nx?: boolean }
  ): Promise<"OK" | null> {
    if (opts?.nx && this.store.has(key) && !this.expired(key)) return null;
    const expiresAt = opts?.ex ? Date.now() + opts.ex * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const k of keys) if (this.store.delete(k)) count++;
    return count;
  }

  async lpush(key: string, ...values: unknown[]): Promise<number> {
    this.expired(key);
    const existing = (this.store.get(key)?.value ?? []) as unknown[];
    const list = [...values.reverse(), ...existing];
    this.store.set(key, { value: list });
    return list.length;
  }

  async rpop(key: string): Promise<unknown | null> {
    this.expired(key);
    const existing = (this.store.get(key)?.value ?? []) as unknown[];
    if (existing.length === 0) return null;
    const val = existing.pop()!;
    this.store.set(key, { value: existing });
    return val;
  }

  async llen(key: string): Promise<number> {
    this.expired(key);
    return ((this.store.get(key)?.value ?? []) as unknown[]).length;
  }

  /** Alias for set(..., { ex: seconds }) — matches Redis SETEX signature */
  async setex(key: string, seconds: number, value: unknown): Promise<"OK"> {
    await this.set(key, value, { ex: seconds });
    return "OK";
  }

  async expire(key: string, seconds: number): Promise<number> {
    const e = this.store.get(key);
    if (!e || this.expired(key)) return 0;
    e.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async ping(): Promise<string> {
    return "PONG";
  }
}

export const redisMock = new MemoryStore();
