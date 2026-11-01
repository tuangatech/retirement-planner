// src/components/results/MonteCarloChart.tsx - Simplified 3-Line Version

import { useMemo } from 'react';
import {
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ComposedChart,
    ReferenceLine,
} from 'recharts';
import type { SimulationResults } from '@/types'
import type { UserInputs } from '@/types';
import { formatMoney } from '@/lib/format';

interface MonteCarloChartProps {
    results: SimulationResults;
    inputs: UserInputs;
}

// Module scope, not inside the chart: a component defined during render is remounted
// on every render. It only needs formatMoney, so nothing is lost by hoisting.
const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
        <div className="bg-white border-2 border-gray-300 rounded-lg p-3 shadow-lg">
            <p className="font-semibold mb-2">Age {payload[0].payload.age}</p>
            {payload.map((entry: any) => (
                <p key={entry.dataKey} style={{ color: entry.color }} className="text-sm">
                    {entry.name}: {formatMoney(entry.value)}
                </p>
            ))}
        </div>
    );
};

export default function MonteCarloChart({ results, inputs }: MonteCarloChartProps) {
    const successRate = results.successRate * 100;

    // Simple chart data with only 3 lines
    const chartData = useMemo(() => {
        const medianProjections = results.selectedRuns.p50.projections;
        const p10Projections = results.selectedRuns.p10.projections;
        const p90Projections = results.selectedRuns.p90.projections;

        return medianProjections.map((projection, index) => ({
            age: projection.age,
            median: projection.portfolio.balances.total,
            p10: p10Projections[index]?.portfolio.balances.total || 0,
            p90: p90Projections[index]?.portfolio.balances.total || 0,
        }));
    }, [results]);

    // Cap the y-axis to the median's range (plus headroom) so the rare "Lucky" upside
    // doesn't squash the Typical/Unlucky lines that actually tell the story on a failing
    // plan. The Lucky line clips above the cap; a note below discloses it.
    const yDomainMax = useMemo(() => {
        if (chartData.length === 0) return 0;
        const start = chartData[0].median;
        const medianPeak = Math.max(...chartData.map(d => d.median));
        const base = Math.max(start, medianPeak, 1);
        return Math.ceil((base * 1.6) / 500_000) * 500_000;
    }, [chartData]);
    const p90ExceedsCap = yDomainMax > 0 && chartData.some(d => d.p90 > yDomainMax);

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
                <div className="mb-4">
                    <h3 className="text-lg font-semibold">Portfolio Outcomes Across {results.numberOfRuns.toLocaleString()} Scenarios</h3>
                    <p className="text-sm text-gray-600">
                        Three key outcomes showing range of possibilities based on market returns
                    </p>
                </div>

                {/* Warning for low success rates */}
                {successRate < 75 && (
                    <div className={`mb-4 rounded-lg p-4 ${successRate < 50 ? 'bg-red-50 border border-red-300' : 'bg-yellow-50 border border-yellow-300'}`}>
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">{successRate < 50 ? '⚠️' : '⚡'}</span>
                            <div className="flex-1 text-sm">
                                <p className={`font-semibold mb-1 ${successRate < 50 ? 'text-red-900' : 'text-yellow-900'}`}>
                                    {successRate < 50
                                        ? `Critical: ${successRate.toFixed(1)}% Success Rate`
                                        : `Warning: ${successRate.toFixed(1)}% Success Rate`
                                    }
                                </p>
                                <p className={successRate < 50 ? 'text-red-800' : 'text-yellow-800'}>
                                    The red "Unlucky" line shows what happens in bad market scenarios.
                                    {successRate < 50
                                        ? ` Notice it hits ${formatMoney(0)} well before your life expectancy.`
                                        : ' Consider reducing spending or working longer for more security.'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Chart */}
                <div className="mt-6">
                    <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart data={chartData} margin={{ top: 15, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

                            <XAxis
                                dataKey="age"
                                label={{ value: 'Age', position: 'insideBottom', offset: -10 }}
                                tick={{ fontSize: 12 }}
                            />

                            <YAxis
                                domain={[0, yDomainMax || 'auto']}
                                allowDataOverflow
                                tickFormatter={formatMoney}
                                label={{ value: 'Portfolio Balance', angle: -90, position: 'insideLeft' }}
                                tick={{ fontSize: 12 }}
                            />

                            <Tooltip content={<CustomTooltip />} />

                            <Legend
                                wrapperStyle={{ paddingTop: '20px' }}
                                iconType="line"
                            />

                            {/* Zero line reference */}
                            <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />

                            {/* Retirement age marker */}
                            <ReferenceLine
                                x={inputs.personal.retirementAge}
                                stroke="#9ca3af"
                                strokeDasharray="5 5"
                                label={{ value: `Retire (${inputs.personal.retirementAge})`, position: 'top', fill: '#6b7280', fontSize: 12 }}
                            />

                            {/* Median depletion age marker (for failed scenarios) */}
                            {results.failedRuns.medianAgeOfDepletion && successRate < 75 && (
                                <ReferenceLine
                                    x={results.failedRuns.medianAgeOfDepletion}
                                    stroke="#ef4444"
                                    strokeDasharray="3 3"
                                    strokeWidth={2}
                                    label={{ value: `Failure Age (${results.failedRuns.medianAgeOfDepletion})`, position: 'top', fill: '#dc2626', fontSize: 11 }}
                                />
                            )}

                            {/* Three key lines */}
                            <Line
                                type="monotone"
                                dataKey="p10"
                                stroke="#ef4444"
                                strokeWidth={3}
                                dot={false}
                                name="Unlucky (10%)"
                                strokeDasharray="5 5"
                            />

                            <Line
                                type="monotone"
                                dataKey="median"
                                stroke="#3b82f6"
                                strokeWidth={3}
                                dot={false}
                                name="Typical (Median)"
                            />

                            <Line
                                type="monotone"
                                dataKey="p90"
                                stroke="#10b981"
                                strokeWidth={3}
                                dot={false}
                                name="Lucky (90%)"
                                strokeDasharray="5 5"
                            />
                        </ComposedChart>
                    </ResponsiveContainer>  
                </div>

                {/* Median depletion marker note */}
                {results.failedRuns.medianAgeOfDepletion && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-red-600">
                        <div className="w-4 h-0.5 bg-red-500 border-t-2 border-dashed" />
                        <span>
                            Median depletion age ({results.failedRuns.medianAgeOfDepletion}) marks when half of failed scenarios ran out of money
                        </span>
                    </div>
                )}

                {/* Disclose the y-axis cap so the clipped Lucky line isn't misread */}
                {p90ExceedsCap && (
                    <p className="mt-2 text-xs text-gray-500">
                        Chart top is capped at {formatMoney(yDomainMax)} for readability — the “Lucky (90%)” line rises above this in the best scenarios.
                    </p>
                )}
            </div>

            {/* Interpretation Guide */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-0.5 bg-red-500 border-t-2 border-dashed" />
                        <h4 className="font-semibold text-red-900">Unlucky (10%)</h4>
                    </div>
                    <p className="text-sm text-red-800">
                        {successRate >= 90 ? (
                            <>
                                Even in the worst 10% of scenarios with below-average returns, your portfolio {results.selectedRuns.p10.projections[results.selectedRuns.p10.projections.length - 1].portfolio.balances.total > 0 ? 'survives' : 'lasts many years'}.
                            </>
                        ) : (
                            <>
                                In unlucky scenarios with poor market returns, your portfolio depletes early. This happens in {(100 - successRate).toFixed(0)}% of simulations.
                                <strong className="block mt-2 text-red-700">
                                    Plan adjustments recommended to avoid this outcome.
                                </strong>
                            </>
                        )}
                    </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-0.5 bg-blue-500" />
                        <h4 className="font-semibold text-blue-900">Typical (Median)</h4>
                    </div>
                    <p className="text-sm text-blue-800">
                        The middle outcome - half of scenarios do better, half do worse. This is the most likely result with average market returns.
                        {successRate < 75 && (
                            <strong className="block mt-2 text-blue-700">
                                Even this "typical" outcome may not meet your goals.
                            </strong>
                        )}
                    </p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-0.5 bg-green-500 border-t-2 border-dashed" />
                        <h4 className="font-semibold text-green-900">Lucky (90%)</h4>
                    </div>
                    <p className="text-sm text-green-800">
                        {successRate < 75 ? (
                            <>
                                In the best 10% of scenarios with above-average returns, your portfolio performs well. But relying on being "lucky" is not a sound retirement plan.
                                <strong className="block mt-2 text-green-700">
                                    These lucky scenarios are rare - plan for the median, not the best case.
                                </strong>
                            </>
                        ) : (
                            <>
                                In the best 10% of scenarios with above-average returns, your portfolio grows significantly. Room for increased spending or legacy planning.
                            </>
                        )}
                    </p>
                </div>
            </div>

            {/* Key Insights Box */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-5">
                <h4 className="font-semibold text-blue-900 mb-3">📊 Understanding These Three Lines:</h4>
                <div className="space-y-2 text-sm text-blue-800">
                    <p>
                        • <strong>These are not predictions</strong> - they show the range of possible outcomes based on {results.numberOfRuns.toLocaleString()} simulations with different market returns.
                    </p>
                    <p>
                        • <strong>The spread matters</strong> - A wider gap between Unlucky and Lucky lines means more uncertainty in your outcome.
                    </p>
                    <p>
                        • <strong>Plan for the middle</strong> - The median line is your most realistic expectation. If it doesn't meet your goals, adjustments are needed.
                    </p>
                    <p className="pt-2 border-t border-blue-300">
                        💡 <strong>Rule of thumb:</strong> A good retirement plan has the "Unlucky" line staying above $0. If it hits zero, you're relying on luck.
                    </p>
                </div>
            </div>
        </div>
    );
}