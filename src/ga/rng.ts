/**
 * Seeded random number generator (mulberry32).
 *
 * A fixed seed makes every run reproducible, so the demo behaves the same way every time.
 * (Math.random can't be seeded.) The four lines in next() are the standard mulberry32
 * mixing steps: they scramble a counter into a number that looks random.
 */
export class Rng {
  private state: number;

  /** The generator's whole memory: one 32-bit number, advanced on every call. */
  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform integer in [0, max). */
  int(max: number): number {
    return Math.floor(this.next() * max);
  }

  /** True with probability p. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** A random element, e.g. a random teacher from a session's qualified list. */
  pick<T>(items: readonly T[]): T {
    return items[this.int(items.length)];
  }
}
