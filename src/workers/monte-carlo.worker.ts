// src/workers/monte-carlo.worker.ts

/**
 * Monte Carlo Simulation Web Worker
 * 
 * Runs thousands of retirement simulations in a separate thread to avoid
 * blocking the UI. Each simulation uses randomized investment returns to
 * model market uncertainty.
 * 
 * Message Flow:
 * 1. Main thread sends: { type: 'START', inputs, numberOfRuns }
 * 2. Worker runs simulations and periodically sends progress
 * 3. Worker sends: { type: 'COMPLETE', results }
 * 
 * Performance:
 * - 1,000 runs: ~2 seconds
 * - 5,000 runs: ~5 seconds
 * - 10,000 runs: ~10 seconds
 */

import type { UserInputs, SimulationResults, SimulationRun, SelectedRun } from '@/types';
import { createSeededRNG, createRunSeed } from '@/lib/calculations/random';
import { runCompleteSimulation, YearlyProjection } from '@/lib/calculations/yearlyProjection';

/**
 * Message types for worker communication.
 */
interface StartMessage {
    type: 'START';
    inputs: UserInputs;
    numberOfRuns: number;
}

interface ProgressMessage {
    type: 'PROGRESS';
    progress: number; // 0-100
    currentRun: number;
    totalRuns: number;
}

interface CompleteMessage {
    type: 'COMPLETE';
    results: SimulationResults;
}

interface ErrorMessage {
    type: 'ERROR';
    error: string;
}

type WorkerMessage = StartMessage;
type WorkerResponse = ProgressMessage | CompleteMessage | ErrorMessage;

function sendMessage(message: WorkerResponse): void {
    self.postMessage(message);
}

/**
 * Main worker message handler.
 */
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
    const message = event.data;

    // Use type guard for validation
    if (!isStartMessage(message)) {
        sendMessage({
            type: 'ERROR',
            error: 'Invalid message: expected START with inputs and numberOfRuns'
        });
        return;
    }

    try {
        const results = runMonteCarloSimulation(message.inputs, message.numberOfRuns);

        const completeMessage: CompleteMessage = {
            type: 'COMPLETE',
            results,        // → Back to ResultsContext
        };

        sendMessage(completeMessage);
    } catch (error) {
        const errorMessage: ErrorMessage = {
            type: 'ERROR',
            error: error instanceof Error ? error.message : 'Unknown error',
        };

        sendMessage(errorMessage);
    }
};

/**
 * Runs the complete Monte Carlo simulation.
 * 
 * @param inputs - User inputs for the simulation
 * @param numberOfRuns - Number of simulation runs to execute
 * @returns Aggregated simulation results
 */
function runMonteCarloSimulation(
    inputs: UserInputs,
    numberOfRuns: number
): SimulationResults {
    const startTime = Date.now();

    // Storage for all runs (minimal data)
    const allRuns: SimulationRun[] = [];
    let successCount = 0;

    // Storage for full projections (selected runs only)
    const fullProjectionRuns = new Map<number, YearlyProjection[]>();

    // Random sample for spaghetti chart (max 200 runs)
    const sampleSize = Math.min(200, Math.floor(numberOfRuns * 0.2));
    const sampleIndices = selectRandomSample(numberOfRuns, sampleSize);

    // Run all simulations
    for (let runId = 0; runId < numberOfRuns; runId++) {
        const seed = createRunSeed(runId);
        const rng = createSeededRNG(seed);
        const result = runCompleteSimulation(inputs, rng);

        // Store minimal result
        const run: SimulationRun = {
            runId,
            success: result.success,
            ageOfDepletion: result.ageOfDepletion,
            finalBalance: result.finalBalance,
        };

        allRuns.push(run);

        if (result.success) {
            successCount++;
        }

        // Store full projections for sample runs
        if (sampleIndices.has(runId)) {
            fullProjectionRuns.set(runId, result.projections);
        }

        // Report progress every 100 runs
        if ((runId + 1) % 100 === 0 || runId === numberOfRuns - 1) {
            const progress = ((runId + 1) / numberOfRuns) * 100;
            sendMessage({
                type: 'PROGRESS',
                progress,
                currentRun: runId + 1,
                totalRuns: numberOfRuns,
            });
        }
    }

    // Calculate success rate
    const successRate = successCount / numberOfRuns;

    // Sort runs by outcome quality: failed runs first (by depletion age), then successful runs (by final balance)
    const sortedRuns = [...allRuns].sort((a, b) => {
        // Failed runs come first (they're worse outcomes)
        if (!a.success && b.success) return -1;
        if (a.success && !b.success) return 1;

        // Among failed runs, earlier depletion is worse
        if (!a.success && !b.success) {
            const ageA = a.ageOfDepletion || 0;
            const ageB = b.ageOfDepletion || 0;
            if (ageA !== ageB) return ageA - ageB;
        }

        // Among successful runs (or tied depletion ages), sort by final balance
        return a.finalBalance - b.finalBalance;
    });

    // Calculate percentile indices from SORTED runs
    const p10Index = Math.floor(numberOfRuns * 0.10);
    const p25Index = Math.floor(numberOfRuns * 0.25);
    const p50Index = Math.floor(numberOfRuns * 0.50);
    const p75Index = Math.floor(numberOfRuns * 0.75);
    const p90Index = Math.floor(numberOfRuns * 0.90);

    // Get the actual run IDs that correspond to these percentiles
    const p10RunId = sortedRuns[p10Index].runId;
    const p50RunId = sortedRuns[p50Index].runId;
    const p90RunId = sortedRuns[p90Index].runId;

    // Calculate percentiles (from sorted balances)
    const percentiles = {
        p10: sortedRuns[p10Index].finalBalance,
        p25: sortedRuns[p25Index].finalBalance,
        p50: sortedRuns[p50Index].finalBalance,
        p75: sortedRuns[p75Index].finalBalance,
        p90: sortedRuns[p90Index].finalBalance,
    };

    // Calculate failed run statistics
    const failedRunsList = allRuns.filter(r => !r.success);
    const failedAges = failedRunsList
        .map(r => r.ageOfDepletion)
        .filter((age): age is number => age !== null)
        .sort((a, b) => a - b);

    const medianAgeOfDepletion = failedAges.length > 0
        ? failedAges[Math.floor(failedAges.length / 2)]
        : null;

    // Use the CORRECT run IDs for selected runs
    const selectedRuns = {
        p10: getOrCreateSelectedRun(p10RunId, inputs, fullProjectionRuns, 'p10'),
        p50: getOrCreateSelectedRun(p50RunId, inputs, fullProjectionRuns, 'p50'),
        p90: getOrCreateSelectedRun(p90RunId, inputs, fullProjectionRuns, 'p90'),
    };

    // Get sample runs for spaghetti chart
    const sampleRuns = Array.from(sampleIndices)
        .map(runId => {
            const projections = fullProjectionRuns.get(runId);
            if (!projections) {
                console.warn(`Missing projections for run ${runId}`);
                return null;
            }
            return { runId, projections };
        })
        .filter((run): run is { runId: number; projections: YearlyProjection[] } => run !== null);

    const endTime = Date.now();
    console.log(`Monte Carlo simulation completed in ${(endTime - startTime) / 1000}s`);

    console.log('Percentile Run IDs:', { p10: p10RunId, p50: p50RunId, p90: p90RunId });
    console.log('Percentile Balances:', percentiles);

    return {
        timestamp: Date.now(),
        numberOfRuns,
        successRate,
        percentiles,
        failedRuns: {
            count: failedRunsList.length,
            medianAgeOfDepletion,
        },
        selectedRuns,
        sampleRuns,
    };
}

/**
 * Selects random indices for sampling.
 * 
 * @param totalRuns - Total number of runs
 * @param sampleSize - Number of runs to sample
 * @returns Set of run indices to sample
 */
function selectRandomSample(totalRuns: number, sampleSize: number): Set<number> {
    const indices = new Set<number>();

    // Always include first and last run
    indices.add(0);
    indices.add(totalRuns - 1);

    // Add random runs
    while (indices.size < sampleSize) {
        const randomIndex = Math.floor(Math.random() * totalRuns);
        indices.add(randomIndex);
    }

    return indices;
}

/**
 * Gets a selected run from cache or re-runs the simulation.
 * 
 * @param runId - Run ID to get
 * @param inputs - User inputs
 * @param cache - Cache of full projection runs
 * @param percentile - Percentile label
 * @returns Selected run with full projections
 */
function getOrCreateSelectedRun(
    runId: number,
    inputs: UserInputs,
    cache: Map<number, YearlyProjection[]>,
    percentile: 'p10' | 'p50' | 'p90'
): SelectedRun {
    // Check if we already have this run in cache
    if (cache.has(runId)) {
        return {
            runId,
            percentile,
            projections: cache.get(runId)!,
        };
    }

    // Re-run this specific simulation
    const seed = createRunSeed(runId);
    const rng = createSeededRNG(seed);
    const result = runCompleteSimulation(inputs, rng);

    return {
        runId,
        percentile,
        projections: result.projections,
    };
}

/**
 * Type guard for worker messages.
 */
function isStartMessage(message: unknown): message is StartMessage {
    return (
        message !== null &&
        typeof message === 'object' &&
        (message as StartMessage).type === 'START' &&
        typeof (message as StartMessage).inputs === 'object' &&
        typeof (message as StartMessage).numberOfRuns === 'number'
    );
}