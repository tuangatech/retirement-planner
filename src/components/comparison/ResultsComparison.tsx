import React from 'react';
import type { SavedScenario } from '@/lib/storage/scenarioStorage';
import { TrendingUp, TrendingDown, Minus, BarChart2 } from 'lucide-react';

interface ResultsComparisonProps {
    scenarioA: SavedScenario;
    scenarioB: SavedScenario;
}

// Hoisted to module scope: a component defined inside another component is a new type
// on every render, so React would remount every row each time. None of these use props.
const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    });
};

const formatPercent = (value: number) => {
    const percentValue = value > 1 ? value : value * 100;
    return `${percentValue.toFixed(1)}%`;
};

const getComparisonIcon = (delta: number, threshold: number = 0) => {
    if (Math.abs(delta) < threshold) {
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
    return delta > 0 ? (
        <TrendingUp className="w-4 h-4 text-green-600" />
    ) : (
        <TrendingDown className="w-4 h-4 text-blue-600" />
    );
};

const getComparisonColor = (delta: number, threshold: number = 0) => {
    if (Math.abs(delta) < threshold) return 'text-gray-600';
    return delta > 0 ? 'text-green-600' : 'text-blue-600';
};

const formatDelta = (delta: number, isPercent: boolean = false) => {
    const formatted = isPercent
        ? formatPercent(Math.abs(delta))
        : formatCurrency(Math.abs(delta));
    const prefix = delta > 0 ? '+' : delta < 0 ? '-' : '';
    return `${prefix}${formatted}`;
};

// Reusable row component
const ComparisonRow = ({
    label,
    description,
    valueA,
    valueB,
    delta,
    threshold,
    isPercent = false,
}: {
    label: string;
    description: string;
    valueA: string;
    valueB: string;
    delta: number;
    threshold: number;
    isPercent?: boolean;
}) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-start justify-between gap-4">
            {/* Left: label + icon */}
            <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 flex-shrink-0">
                    {getComparisonIcon(delta, threshold)}
                </div>
                <div>
                    <p className="font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                </div>
            </div>

            {/* Right: A / B / Difference values */}
            <div className="flex items-center gap-6 flex-shrink-0 text-right">
                <div>
                    <p className="text-xs text-gray-500 mb-0.5">Scenario A</p>
                    <p className="font-semibold text-gray-900">{valueA}</p>
                </div>
                <div className="min-w-[75px]">
                    <p className="text-xs text-gray-500 mb-0.5">Scenario B</p>
                    <p className="font-semibold text-gray-900">{valueB}</p>
                </div>
                <div className="min-w-[88px]">
                    <p className="text-xs text-gray-500 mb-0.5">Difference</p>
                    <p className={`font-semibold ${getComparisonColor(delta, threshold)}`}>
                        {formatDelta(delta, isPercent)}
                    </p>
                </div>
            </div>
        </div>
    </div>
);

export const ResultsComparison: React.FC<ResultsComparisonProps> = ({
    scenarioA,
    scenarioB,
}) => {
    // Check if both scenarios have results
    const hasResults = scenarioA.results && scenarioB.results;

    if (!hasResults) {
        return (
            <div className="bg-gradient-to-r from-blue-50 via-white to-purple-50 rounded-lg p-6 border-2 border-gray-200 shadow-md">
                <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <BarChart2 className="w-6 h-6 text-gray-600" />
                    Results Comparison
                </h2>
                <p className="text-gray-600 text-sm">
                    Both scenarios must have simulation results to compare. Please run simulations for both scenarios.
                </p>
            </div>
        );
    }

    const resultsA = scenarioA.results!;
    const resultsB = scenarioB.results!;

    // Calculate key metrics
    const successRateDelta = resultsA.successRate - resultsB.successRate;
    const medianFinalDelta = resultsA.percentiles.p50 - resultsB.percentiles.p50;
    const p25FinalDelta = resultsA.percentiles.p25 - resultsB.percentiles.p25;
    const p75FinalDelta = resultsA.percentiles.p75 - resultsB.percentiles.p75;

    return (
        <div className="bg-gradient-to-r from-blue-50 via-white to-purple-50 rounded-lg p-6 border-2 border-gray-200 shadow-md">
            {/* Header — matches DifferenceSummary style */}
            <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                <BarChart2 className="w-6 h-6 text-gray-600" />
                Results Comparison
            </h2>
            <p className="text-sm text-gray-600 mb-2">
                Comparing simulation outcomes between the two scenarios
            </p>

            {/* Scenario legend — clearly maps names to A / B */}
            <div className="flex flex-wrap gap-3 mb-6">
                <span className="inline-flex items-center gap-1.5 bg-white border border-gray-300 rounded-md px-3 py-1 text-sm font-medium text-gray-700">
                    <span className="font-bold text-blue-600">A</span>
                    <span className="text-gray-400">·</span>
                    {scenarioA.name}
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white border border-gray-300 rounded-md px-3 py-1 text-sm font-medium text-gray-700">
                    <span className="font-bold text-purple-600">B</span>
                    <span className="text-gray-400">·</span>
                    {scenarioB.name}
                </span>
            </div>

            {/* Metric rows */}
            <div className="space-y-3">
                <ComparisonRow
                    label="Success Rate"
                    description="Percentage of scenarios that didn't run out of money"
                    valueA={formatPercent(resultsA.successRate)}
                    valueB={formatPercent(resultsB.successRate)}
                    delta={successRateDelta}
                    threshold={0.05}
                    isPercent={true}
                />
                <ComparisonRow
                    label="Median Final Balance"
                    description="Middle outcome across all scenarios (50th percentile)"
                    valueA={formatCurrency(resultsA.percentiles.p50)}
                    valueB={formatCurrency(resultsB.percentiles.p50)}
                    delta={medianFinalDelta}
                    threshold={10000}
                />
                <ComparisonRow
                    label="Downside Balance"
                    description="Pessimistic outcome — worse than 75% of scenarios (25th percentile)"
                    valueA={formatCurrency(resultsA.percentiles.p25)}
                    valueB={formatCurrency(resultsB.percentiles.p25)}
                    delta={p25FinalDelta}
                    threshold={10000}
                />
                <ComparisonRow
                    label="Upside Balance"
                    description="Optimistic outcome — better than 75% of scenarios (75th percentile)"
                    valueA={formatCurrency(resultsA.percentiles.p75)}
                    valueB={formatCurrency(resultsB.percentiles.p75)}
                    delta={p75FinalDelta}
                    threshold={10000}
                />
            </div>

            {/* Interpretation Guide */}
            <div className="mt-5 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">How to read the Difference column</h4>
                <ul className="space-y-1.5 text-sm text-blue-800">
                    <li className="flex gap-2">
                        <TrendingUp className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                        <span><strong>Green / upward:</strong> Scenario A is ahead on this metric</span>
                    </li>
                    <li className="flex gap-2">
                        <TrendingDown className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                        <span><strong>Blue / downward:</strong> Scenario B is ahead on this metric</span>
                    </li>
                    <li className="flex gap-2">
                        <Minus className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                        <span><strong>Gray / flat:</strong> Scenarios are effectively the same</span>
                    </li>
                </ul>
                <p className="text-xs text-blue-700 mt-3 italic">
                    Higher success rates and final balances generally indicate a more secure plan,
                    but weigh these against your personal risk tolerance and lifestyle goals.
                </p>
            </div>
        </div>
    );
};

export default ResultsComparison;