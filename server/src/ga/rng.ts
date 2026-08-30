/**
 * Seedable pseudo-random number generator (mulberry32).
 *
 * The proposal does not require a seedable RNG, but the Result Analysis chapter does:
 * Expected Outcome 5 promises a "comparative analysis of different parameter
 * configurations". Comparing configurations is only meaningful if the randomness is held
 * constant between them, and a benchmark an examiner cannot reproduce proves nothing.
 *
 * mulberry32 is 4 lines of arithmetic with no dependencies, so it does not encroach on
 * the "implemented from scratch, without external libraries" requirement.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    // Mix the seed so that adjacent seeds (1, 2, 3...) produce unrelated streams.
    this.state = (seed >>> 0) || 0x9e3779b9;
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

  /** Uniformly picks one element. Caller guarantees the array is non-empty. */
  pick<T>(items: readonly T[]): T {
    return items[this.int(items.length)];
  }
}
