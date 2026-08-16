// src/components/scenarios/ScenarioCard.tsx

import { CheckCircle, Trash2, FolderOpen } from 'lucide-react';
import type { SavedScenario } from '@/lib/storage/scenarioStorage';

interface ScenarioCardProps {
    scenario: SavedScenario;
    selectionMode?: boolean;
    quickCompareMode?: boolean;  // For instant comparison navigation
    isSelected?: boolean;
    currentScenarioId?: string | null;  // To show "Currently Loaded" indicator
    onSelect?: () => void;
    onDelete: () => void;
    onLoad: () => void;
}

export function ScenarioCard({
    scenario,
    selectionMode = false,
    quickCompareMode = false,
    isSelected = false,
    currentScenarioId = null,
    onSelect,
    onDelete,
    onLoad,
}: ScenarioCardProps) {
    const { name, inputs, createdAt, results } = scenario;

    const totalPortfolio =
        inputs.accounts.taxDeferred.balanceAtRetirement +
        inputs.accounts.roth.balanceAtRetirement +
        inputs.accounts.taxable.balanceAtRetirement +
        inputs.accounts.hsa.balanceAtRetirement;

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        });
    };

    const getSuccessRateColor = (rate: number) => {
        if (rate >= 90) return 'bg-green-100 text-green-800 border-green-300';
        if (rate >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        if (rate >= 50) return 'bg-orange-100 text-orange-800 border-orange-300';
        return 'bg-red-100 text-red-800 border-red-300';
    };

    // Card is clickable in both selection mode and quick compare mode
    const isClickable = selectionMode || quickCompareMode;
    const isCurrentlyLoaded = currentScenarioId === scenario.id;

    return (
        <div
            className={`bg-white rounded-lg shadow hover:shadow-lg transition-all p-6 relative ${quickCompareMode
                    ? 'cursor-pointer hover:ring-2 hover:ring-blue-500'  // special styling for quick compare
                    : selectionMode
                        ? 'cursor-pointer'
                        : ''
                } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
            onClick={isClickable ? onSelect : undefined}
        >
            {/* Currently Loaded Indicator */}
            {isCurrentlyLoaded && (
                <div className="absolute top-2 right-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-medium">
                    Currently Loaded
                </div>
            )}
            {/* Selection checkbox — only in manual selection mode, not quick compare */}
            {selectionMode && !quickCompareMode && (
                <div className="mb-4">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={onSelect}
                        className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            {/* Results Badge */}
            {results && (
                <div className="mb-3">
                    <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border ${getSuccessRateColor(
                            results.successRate * 100
                        )}`}
                    >
                        <CheckCircle className="w-3 h-3" />
                        {(results.successRate * 100).toFixed(0)}% Success Rate
                    </span>
                </div>
            )}

            {/* Scenario Name */}
            <h3 className="text-lg font-bold text-gray-900 mb-2">{name}</h3>

            {/* Key Metrics */}
            <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-600">Retirement Age</span>
                    <span className="font-medium">{inputs.personal.retirementAge}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Life Expectancy</span>
                    <span className="font-medium">{inputs.personal.lifeExpectancy}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Starting Portfolio</span>
                    <span className="font-medium">{formatCurrency(totalPortfolio)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Phase 1 Spending</span>
                    <span className="font-medium">{formatCurrency(inputs.phases[0].annualSpending)}/yr</span>
                </div>
            </div>

            {/* Timestamp */}
            <div className="text-xs text-gray-500 mb-4">
                Saved {new Date(createdAt).toLocaleDateString()}
            </div>

            {/* Action buttons — hidden in both selection mode and quick compare mode */}
            {!selectionMode && !quickCompareMode && (
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onLoad();
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                        title="Load this scenario into wizard"
                    >
                        <FolderOpen className="w-4 h-4" />
                        Load
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="flex items-center justify-center w-9 h-9 text-red-600 bg-red-50 rounded-md hover:bg-red-100 flex-shrink-0"
                        title="Delete this scenario"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}