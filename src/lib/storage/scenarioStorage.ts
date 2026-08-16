// src/lib/storage/scenarioStorage.ts

import type { SimulationResults, UserInputs } from '@/types';

export interface SavedScenario {
    id: string;
    name: string;
    createdAt: number;
    lastModified: number;
    inputs: UserInputs;
    results?: SimulationResults;    // Optional
}

const SCENARIOS_LIST_KEY = 'retirement_scenarios_list';
const SCENARIO_KEY_PREFIX = 'retirement_scenario_';
export const MAX_SCENARIOS = 5;

// Custom error class for better scenario storage error handling
export class StorageError extends Error {
    constructor(
        message: string,
        public userMessage: string,
        public code: 'QUOTA_EXCEEDED' | 'MAX_SCENARIOS' | 'DUPLICATE_NAME' | 'NOT_FOUND' | 'UNKNOWN'
    ) {
        super(message);
        this.name = 'StorageError';
    }
}

export class ScenarioStorage {
    /**
     * Get list of all scenario IDs
     */
    static getScenarioIds(): string[] {
        try {
            const data = localStorage.getItem(SCENARIOS_LIST_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Failed to get scenario list:', error);
            return [];
        }
    }

    /**
     * Get all saved scenarios
     */
    static getAllScenarios(): SavedScenario[] {
        const ids = this.getScenarioIds();
        const scenarios: SavedScenario[] = [];

        for (const id of ids) {
            const scenario = this.loadScenario(id);
            if (scenario) {
                scenarios.push(scenario);
            }
        }

        // Sort by last modified (newest first)
        return scenarios.sort((a, b) => b.lastModified - a.lastModified);
    }

    /**
     * Calculate approximate size of a scenario in bytes
     */
    private static calculateScenarioSize(scenario: SavedScenario): number {
        return JSON.stringify(scenario).length * 2; // UTF-16 uses 2 bytes per character
    }

    /**
     * Slim down results to only essential data for comparison.
     * This dramatically reduces storage size (from ~12MB to ~50KB).
     */
    private static slimResults(results: SimulationResults): SimulationResults {
        // Keep the essential data for comparison:
        // 1. Success rate, number of runs
        // 2. Percentiles (just the numbers, not full runs)
        // 3. Failed runs info
        // 4. The three selected runs (p10, p50, p90) for visualization

        return {
            timestamp: results.timestamp,
            successRate: results.successRate,
            numberOfRuns: results.numberOfRuns,
            percentiles: results.percentiles,   // Just 3 numbers (p10, p50, p90)
            failedRuns: results.failedRuns,     // Count and median depletion age
            selectedRuns: results.selectedRuns, // Keep the 3 runs for charts
        };
    }

    /**
     * Save a scenario with comprehensive error handling
     */
    static saveScenario(name: string, inputs: UserInputs, results?: SimulationResults | null, id?: string): SavedScenario | null {
        const scenarioId = id || this.generateId();
        const now = Date.now();

        // Slim down results before saving
        const slimmedResults = results ? this.slimResults(results) : undefined;

        const scenario: SavedScenario = {
            id: scenarioId,
            name,
            createdAt: id ? (this.loadScenario(id)?.createdAt || now) : now,
            lastModified: now,
            inputs,                
            ...(slimmedResults && { results: slimmedResults }),  // Only add slimmed results if they exist
        };

        // Check if we're at max capacity (only for new scenarios)
        if (!id) {
            const existingIds = this.getScenarioIds();
            if (existingIds.length >= MAX_SCENARIOS) {
                throw new StorageError(
                    `Maximum ${MAX_SCENARIOS} scenarios reached`,
                    `You can only save up to ${MAX_SCENARIOS} scenarios. Please delete an old scenario before creating a new one.`,
                    'MAX_SCENARIOS'
                );
            }
        }

        // Check for duplicate names
        if (this.scenarioNameExists(name, id)) {
            throw new StorageError(
                `Scenario name "${name}" already exists`,
                `A scenario named "${name}" already exists. Please choose a different name.`,
                'DUPLICATE_NAME'
            );
        }

        // Estimate size and check if it will fit
        const scenarioSize = this.calculateScenarioSize(scenario);
        const storageInfo = this.getStorageInfo();

        // If updating existing scenario, subtract old size
        let oldScenarioSize = 0;
        if (id) {
            const existingScenario = this.loadScenario(id);
            if (existingScenario) {
                oldScenarioSize = this.calculateScenarioSize(existingScenario);
            }
        }

        const netNewSize = scenarioSize - oldScenarioSize;
        const estimatedNewUsage = storageInfo.used + netNewSize;

        // Lenient threshold (95%) with an error message that includes actual numbers
        if (estimatedNewUsage > storageInfo.total * 0.95) {
            const availableSpace = (storageInfo.total * 0.95) - storageInfo.used;
            throw new StorageError(
                'Storage quota will be exceeded',
                `Your browser storage is nearly full. This scenario requires ${this.formatBytes(scenarioSize)} but only ${this.formatBytes(availableSpace)} is available. Try deleting old scenarios to free up space.`,
                'QUOTA_EXCEEDED'
            );
        }

        try {
            // Save the scenario
            localStorage.setItem(
                `${SCENARIO_KEY_PREFIX}${scenarioId}`,
                JSON.stringify(scenario)
            );

            // Update scenarios list (if new scenario)
            if (!id) {
                const ids = this.getScenarioIds();
                ids.push(scenarioId);
                localStorage.setItem(SCENARIOS_LIST_KEY, JSON.stringify(ids));
            }

            return scenario;
        } catch (error) {
            console.error('Failed to save scenario:', error);

            // Handle quota exceeded error
            if (error instanceof Error && error.name === 'QuotaExceededError') {
                throw new StorageError(
                    'Browser storage quota exceeded',
                    'Your browser storage is full. Please delete some old scenarios to free up space. Each scenario with results takes approximately 50-200 KB.',
                    'QUOTA_EXCEEDED'
                );
            }

            // Generic error
            throw new StorageError(
                'Failed to save scenario',
                'An unexpected error occurred while saving. Please try again or contact support if the problem persists.',
                'UNKNOWN'
            );
        }
    }

    /**
     * Format bytes to human-readable string
     */
    private static formatBytes(bytes: number): string {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    /**
     * Load a scenario by ID
     */
    static loadScenario(id: string): SavedScenario | null {
        try {
            const data = localStorage.getItem(`${SCENARIO_KEY_PREFIX}${id}`);
            if (!data) return null;

            const scenario = JSON.parse(data);

            // Validate structure
            if (!scenario.id || !scenario.inputs || !scenario.inputs.personal) {
                console.error(`Invalid scenario structure for ${id}`);
                return null;
            }

            // Backward compat: scenarios saved before the withdrawal-strategy feature have
            // no `strategy` field. Default them to 'standard' so they stay faithful to how
            // they were originally computed (their saved results reflect the old taxable-first
            // order) rather than silently switching to tax-smart. New scenarios get
            // 'tax_smart' from DEFAULT_VALUES.
            if (scenario.inputs.withdrawalStrategy && !scenario.inputs.withdrawalStrategy.strategy) {
                scenario.inputs.withdrawalStrategy.strategy = 'standard';
            }

            // Backward compat: scenarios saved before state tax existed have no
            // `stateTaxMode`. Default them to 'manual' — their saved marginal rate already
            // has state points folded in, so computing state tax on top would tax them twice.
            // New scenarios get 'modeled' from DEFAULT_VALUES.
            if (scenario.inputs.tax && !scenario.inputs.tax.stateTaxMode) {
                scenario.inputs.tax.stateTaxMode = 'manual';
            }

            return scenario;
        } catch (error) {
            console.error(`Failed to load scenario ${id}:`, error);
            return null;
        }
    }

    /**
     * Delete a scenario
     */
    static deleteScenario(id: string): boolean {
        try {
            // Remove scenario data
            localStorage.removeItem(`${SCENARIO_KEY_PREFIX}${id}`);

            // Update scenarios list
            const ids = this.getScenarioIds();
            const newIds = ids.filter((scenarioId) => scenarioId !== id);
            localStorage.setItem(SCENARIOS_LIST_KEY, JSON.stringify(newIds));

            return true;
        } catch (error) {
            console.error(`Failed to delete scenario ${id}:`, error);
            return false;
        }
    }

    /**
     * Get storage usage information
     */
    static getStorageInfo(): { used: number; total: number; percentage: number } {
        let used = 0;
        const total = 5 * 1024 * 1024; // 5MB typical localStorage limit

        try {
            for (const key in localStorage) {
                if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
                    used += (localStorage[key].length + key.length) * 2; // UTF-16
                }
            }
        } catch (error) {
            console.error('Failed to calculate storage usage:', error);
        }

        return {
            used,
            total,
            percentage: Math.round((used / total) * 100),
        };
    }

    /**
     * Generate unique ID
     */
    private static generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Check if profile name already exists
     */
    static scenarioNameExists(name: string, excludeId?: string): boolean {
        const scenarios = this.getAllScenarios();
        return scenarios.some(
            (scenario) => scenario.name.toLowerCase() === name.toLowerCase() && scenario.id !== excludeId
        );
    }
}

// Export helper functions
export function getAllScenarios(): SavedScenario[] {
    return ScenarioStorage.getAllScenarios();
}

export function loadScenario(id: string): SavedScenario | null {
    return ScenarioStorage.loadScenario(id);
}

export function deleteScenario(id: string): boolean {
    return ScenarioStorage.deleteScenario(id);
}

export function saveScenario(
    name: string,
    inputs: UserInputs,
    results?: SimulationResults | null,
    id?: string
): SavedScenario | null {
    return ScenarioStorage.saveScenario(name, inputs, results, id);
}