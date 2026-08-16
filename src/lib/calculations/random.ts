// src/lib/calculations/random.ts

/**
 * Random Number Generation Module
 * 
 * Provides seeded pseudo-random number generation (PRNG) and Box-Muller
 * transformation for normally distributed random numbers.
 * 
 * Key Features:
 * - Mulberry32 PRNG for reproducible randomness
 * - Box-Muller transform for normal distribution
 * - Deterministic: same seed produces same sequence
 */

/**
 * Creates a seeded pseudo-random number generator using Mulberry32 algorithm.
 * 
 * Mulberry32 is a simple and fast PRNG suitable for Monte Carlo simulations.
 * It has a period of 2^32 and produces uniformly distributed values.
 * 
 * @param seed - Integer seed value (0 to 2^32-1)
 * @returns Generator function that produces random floats in [0, 1)
 * 
 * @example
 * const rng = createSeededRNG(12345);
 * const random1 = rng(); // 0.123...
 * const random2 = rng(); // 0.456...
 */
export function createSeededRNG(seed: number): () => number {
    // Ensure seed is a 32-bit unsigned integer
    let state = seed >>> 0;

    return function (): number {
        // Mulberry32 algorithm
        state = (state + 0x6d2b79f5) | 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        t = (t ^ (t >>> 14)) >>> 0;

        // Convert to [0, 1) range
        return t / 4294967296;
    };
}

/**
 * FIX: Extracts the Box-Muller sampling step into its own helper so that
 * generateAccountReturns can draw a single Z-score and share it across all
 * accounts in the same year.
 *
 * Consuming exactly 2 rng() calls per invocation keeps the RNG sequence
 * deterministic and consistent with the previous per-account call count
 * (each old generateNormalReturn call also consumed 2 rng() calls).
 *
 * @param rng - Seeded random number generator
 * @returns Standard-normal variate z ~ N(0, 1)
 */
function sampleStandardNormal(rng: () => number): number {
    // Generate two uniform random numbers in (0, 1).
    // u1 must be > 0 to avoid log(0).
    let u1 = rng();
    const u2 = rng();

    while (u1 === 0) {
        u1 = rng();
    }

    // Box-Muller transform: z ~ N(0, 1)
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Generates a random number from a normal (Gaussian) distribution
 * using the Box-Muller transform, with optional bounds.
 * 
 * The Box-Muller transform converts two independent uniform random
 * variables into two independent standard normal random variables.
 * 
 * @param mean - Mean (μ) of the normal distribution
 * @param stdDev - Standard deviation (σ) of the normal distribution
 * @param rng - Seeded random number generator function
 * @param minReturn - Minimum allowed return (default: -0.50 = -50%)
 * @param maxReturn - Maximum allowed return (default: 0.50 = +50%)
 * @returns Random number from N(mean, stdDev²), clamped to [minReturn, maxReturn]
 * 
 * @example
 * const rng = createSeededRNG(12345);
 * const return1 = generateNormalReturn(0.07, 0.18, rng); // 7% mean, 18% std dev
 * // Result might be: 0.05 (5% return) or 0.12 (12% return)
 * // Extreme values capped: -0.50 to +0.50 (covers 99.1% of scenarios)
 */
export function generateNormalReturn(
    mean: number,
    stdDev: number,
    rng: () => number,
    minReturn: number = -0.50,
    maxReturn: number = 0.50
): number {
    const z0 = sampleStandardNormal(rng);

    // Scale and shift to desired distribution
    const rawReturn = mean + stdDev * z0;

    // Clamp to bounds
    return Math.max(minReturn, Math.min(maxReturn, rawReturn));
}

/**
 * Generates correlated market returns for all accounts in a single year.
 *
 * FIX (was: independent returns per account):
 * Previously, each account received a separate Box-Muller draw, producing
 * completely uncorrelated returns within the same year. For example, at age 59
 * the tax-deferred account could show +9.8% while the HSA showed -9.4% — an
 * impossible split for accounts invested in the same broad market.
 *
 * Root cause: generateNormalReturn consumed 2 rng() calls per account, so four
 * accounts advanced the RNG by 8 steps and landed on unrelated Z-scores.
 *
 * Fix: Draw ONE standard-normal variate z (2 rng() calls) and apply it to every
 * account's expected return. Accounts with the same expected return and stdDev
 * now always receive the same realized return in a given year, matching real-world
 * behavior where accounts in the same portfolio move with the same market.
 *
 * ⚠️  RNG sequence note: this change reduces the RNG consumption from 8 calls/year
 * to 2 calls/year. Simulation results will differ from those produced before this
 * fix — that is expected and correct. Saved scenarios with old results should be
 * re-run.
 *
 * @param expectedRates - Object with expected return rates for each account type
 * @param stdDev - Standard deviation applied to all accounts (same market shock)
 * @param rng - Seeded random number generator
 * @returns Object with correlated actual returns for each account type
 *
 * @example
 * const rng = createSeededRNG(12345);
 * const rates = { taxDeferred: 0.07, roth: 0.07, taxable: 0.07, hsa: 0.05 };
 * const returns = generateAccountReturns(rates, 0.15, rng);
 * // All accounts share the same market shock Z this year:
 * // e.g. Z = 0.8 → taxDeferred: 0.19, roth: 0.19, taxable: 0.19, hsa: 0.17
 */
export function generateAccountReturns(
    expectedRates: {
        taxDeferred: number;
        roth: number;
        taxable: number;
        hsa: number;
    },
    stdDev: number,
    rng: () => number
): {
    taxDeferred: number;
    roth: number;
    taxable: number;
    hsa: number;
} {
    // FIX: Draw a single shared market shock for this year (2 rng() calls total).
    // All accounts experience the same directional return - good years are good
    // for every account; bad years are bad for every account.
    const sharedZ = sampleStandardNormal(rng);

    const clamp = (r: number) => Math.max(-0.50, Math.min(0.50, r));

    return {
        taxDeferred: clamp(expectedRates.taxDeferred + stdDev * sharedZ),
        roth: clamp(expectedRates.roth + stdDev * sharedZ),
        taxable: clamp(expectedRates.taxable + stdDev * sharedZ),
        hsa: clamp(expectedRates.hsa + stdDev * sharedZ),
    };
}

/**
 * Validates that a seed value is suitable for PRNG.
 * 
 * @param seed - Seed value to validate
 * @returns True if valid, false otherwise
 */
export function isValidSeed(seed: number): boolean {
    return (
        Number.isInteger(seed) &&
        Number.isFinite(seed) &&
        seed >= 0 &&
        seed <= 4294967295 // 2^32 - 1
    );
}

/**
 * Creates a deterministic seed from a run ID.
 * Useful for Monte Carlo simulations where each run needs a unique but reproducible seed.
 * 
 * @param runId - Zero-based run index (0, 1, 2, ...)
 * @param baseSeed - Optional base seed for reproducibility (default: 42)
 * @returns Unique seed for this run
 * 
 * @example
 * const seed1 = createRunSeed(0); // First run
 * const seed2 = createRunSeed(1); // Second run
 * // Different seeds but reproducible across simulations
 */
export function createRunSeed(runId: number, baseSeed: number = 42): number {
    // Use a simple hash function to generate unique seeds
    const seed = (baseSeed * 1000 + runId) >>> 0;
    return seed;
}