// src/components/results/SummaryDashboard.tsx - Fixed Layout & Honest Recommendations

import { TrendingUp, Calendar, DollarSign, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import type { SimulationResults } from '@/types'
import type { UserInputs } from '@/types';
import { formatMoney } from '@/lib/format';
import { RMD_START_AGE } from '@/lib/calculations/rmd';

interface SummaryDashboardProps {
    results: SimulationResults;
    inputs: UserInputs;
}

export function SummaryDashboard({ results, inputs }: SummaryDashboardProps) {
    const { personal, accounts } = inputs;

    const retirementDuration = personal.lifeExpectancy - personal.retirementAge;

    const startingPortfolio =
        accounts.taxDeferred.balanceAtRetirement +
        accounts.roth.balanceAtRetirement +
        accounts.taxable.balanceAtRetirement +
        accounts.hsa.balanceAtRetirement;

    // Get median run for detailed metrics
    const medianRun = results.selectedRuns.p50;
    const totalTaxes = medianRun.projections.reduce((sum, p) => sum + p.taxes.total, 0);
    const totalExpenses = medianRun.projections
        .filter(p => p.age >= personal.retirementAge)
        .reduce((sum, p) => sum + p.expenses.total, 0);

    const totalHSAHealthcare = medianRun.projections.reduce((sum, p) => sum + p.portfolio.hsaForHealthcare, 0);

    // Success rate analysis
    const successRate = results.successRate * 100;
    const failureRate = 100 - successRate;
    const failedCount = results.failedRuns.count;

    // Determine display tier
    const displayTier = successRate >= 90 ? 'high' : successRate >= 75 ? 'medium' : successRate >= 50 ? 'low' : 'critical';

    const getSuccessColor = () => {
        if (successRate >= 90) return { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-700', gauge: 'text-green-600' };
        if (successRate >= 75) return { bg: 'bg-yellow-50', border: 'border-yellow-500', text: 'text-yellow-700', gauge: 'text-yellow-600' };
        if (successRate >= 50) return { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-700', gauge: 'text-orange-600' };
        return { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-700', gauge: 'text-red-600' };
    };

    const colors = getSuccessColor();

    return (
        <div className="space-y-6">
            {/* Success Probability Gauge - Tiered Display */}
            <div className={`${colors.bg} border-2 ${colors.border} rounded-xl p-8`}>
                <div className="flex items-start gap-4">
                    {successRate >= 75 ? (
                        <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
                    ) : (
                        <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
                    )}

                    <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2 text-gray-700">Plan Success Probability</h3>
                        <div className={`text-7xl font-bold ${colors.gauge} mb-2`}>
                            {successRate.toFixed(1)}%
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            Based on {results.numberOfRuns.toLocaleString()} Monte Carlo simulations
                        </p>

                        {/* Success/Failure messaging */}
                        {displayTier === 'critical' || displayTier === 'low' ? (
                            <div className="mt-4 pt-4 border-t border-gray-300">
                                {/* Side-by-side layout instead of stacked */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="bg-white rounded-lg p-4 border-2 border-red-300">
                                        <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                                            <AlertTriangle className="w-5 h-5" />
                                            {displayTier === 'critical' ? 'CRITICAL PLAN FAILURE' : 'HIGH FAILURE RISK'}
                                        </h4>
                                        <div className="space-y-2 text-sm text-red-800">
                                            <p className="font-medium">
                                                ⚠️ Your portfolio runs out of money in {failureRate.toFixed(1)}% of scenarios
                                                ({failedCount.toLocaleString()} of {results.numberOfRuns.toLocaleString()} simulations)
                                            </p>
                                            {results.failedRuns.medianAgeOfDepletion && (
                                                <>
                                                    <p>
                                                        📅 <strong>Median Depletion Age:</strong> {results.failedRuns.medianAgeOfDepletion} years old
                                                    </p>
                                                    <p>
                                                        ⏱️ <strong>Years Funded:</strong> {results.failedRuns.medianAgeOfDepletion - personal.retirementAge} of {retirementDuration} retirement years
                                                    </p>
                                                    <p className="text-xs text-red-700 mt-2 italic">
                                                        This means the typical failed scenario runs out of money {personal.lifeExpectancy - results.failedRuns.medianAgeOfDepletion} years before your planned life expectancy.
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
                                        <h5 className="font-semibold text-blue-900 mb-2">💡 Consider These Adjustments:</h5>
                                        <p className="text-sm text-blue-800 mb-2">
                                            Small changes can have significant impacts:
                                        </p>
                                        <ul className="text-sm text-blue-800 space-y-1">
                                            <li>• <strong>Retirement age:</strong> Working even 1-2 more years helps substantially</li>
                                            <li>• <strong>Spending:</strong> Reducing expenses by 10-20% improves sustainability</li>
                                            <li>• <strong>Portfolio:</strong> Saving an additional $50K-100K before retiring</li>
                                            {!inputs.income.partTimeWork.enabled && (
                                                <li>• <strong>Income:</strong> Part-time work can bridge the gap to Social Security</li>
                                            )}
                                        </ul>
                                        <p className="text-xs text-blue-700 mt-3 italic">
                                            💡 Use the wizard to test different scenarios and see the actual impact.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : displayTier === 'medium' ? (
                            <div className="mt-4 pt-4 border-t border-gray-300">
                                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                                    <p className="text-sm font-medium text-yellow-900 mb-2">
                                        ⚠️ Acceptable but risky: {failureRate.toFixed(1)}% chance of portfolio depletion
                                    </p>
                                    {results.failedRuns.medianAgeOfDepletion && (
                                        <p className="text-sm text-yellow-800">
                                            Failed scenarios typically deplete at age {results.failedRuns.medianAgeOfDepletion}
                                        </p>
                                    )}
                                    <p className="text-sm text-yellow-800 mt-2">
                                        Consider small adjustments for additional security margin.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 pt-4 border-t border-gray-300">
                                <div className="bg-green-50 border border-green-300 rounded-lg p-4">
                                    <p className="text-sm font-medium text-green-900">
                                        ✅ Strong plan! Your portfolio succeeds in {successRate.toFixed(1)}% of scenarios.
                                    </p>
                                    <p className="text-sm text-green-800 mt-2">
                                        You may have flexibility for increased spending, earlier retirement, or legacy planning.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Portfolio Balance Distribution */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
                <div className="mb-4">
                    <h3 className="text-lg font-semibold">Portfolio Balance at Age {personal.lifeExpectancy}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        Distribution across all {results.numberOfRuns.toLocaleString()} scenarios (including {failedCount.toLocaleString()} failures)
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <OutcomeCard
                        label="Worst 10% of Outcomes"
                        subtitle="10th Percentile"
                        value={results.percentiles.p10}
                        color="orange"
                        context={displayTier === 'critical' || displayTier === 'low' ? 'May include $0 (depleted)' : undefined}
                    />
                    <OutcomeCard
                        label="Typical Outcome"
                        subtitle="Median (50th Percentile)"
                        value={results.percentiles.p50}
                        color="blue"
                        context={displayTier === 'critical' ? 'Includes failed scenarios' : undefined}
                    />
                    <OutcomeCard
                        label="Best 10% of Outcomes"
                        subtitle="90th Percentile"
                        value={results.percentiles.p90}
                        color="green"
                    />
                </div>

                {(displayTier === 'critical' || displayTier === 'low') && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h5 className="text-sm font-semibold text-blue-900 mb-2">📊 Understanding These Numbers:</h5>
                        <p className="text-sm text-blue-800">
                            These percentiles represent the full range of outcomes, including scenarios where the portfolio depletes.
                            The high values at the 90th percentile represent rare scenarios with exceptional market returns (15%+ annually),
                            which occur in only ~{Math.min(successRate, 10).toFixed(1)}% of cases.
                            <strong className="block mt-2">
                                The typical outcome ({failureRate > 50 ? 'portfolio depletion' : formatMoney(results.percentiles.p50)})
                                is more representative of typical scenarios.
                            </strong>
                        </p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    icon={<Clock className="w-6 h-6" />}
                    title="Retirement Duration"
                    value={retirementDuration.toString()}
                    subtitle={`${retirementDuration} years of retirement to fund`}
                    color="blue"
                />

                <MetricCard
                    icon={<TrendingUp className="w-6 h-6" />}
                    title="Portfolio Value"
                    value={
                        <div className="space-y-1">
                            <div className="text-sm text-gray-600">Starting (at retirement)</div>
                            <div className="text-2xl font-bold">{formatMoney(startingPortfolio)}</div>
                            <div className="text-sm text-gray-600 mt-2">Typical outcome at {personal.lifeExpectancy}</div>
                            <div className="text-2xl font-bold">{formatMoney(results.percentiles.p50)}</div>
                        </div>
                    }
                    color="green"
                />

                <MetricCard
                    icon={<DollarSign className="w-6 h-6" />}
                    title="Lifetime Costs (Typical)"
                    value={
                        <div className="space-y-1">
                            <div className="text-sm text-gray-600">Total Taxes</div>
                            <div className="text-2xl font-bold">{formatMoney(totalTaxes)}</div>
                            <div className="text-sm text-gray-600 mt-2">Total Expenses</div>
                            <div className="text-2xl font-bold">{formatMoney(totalExpenses)}</div>
                            {/* Subtle HSA healthcare coverage */}
                            {totalHSAHealthcare > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                    HSA covered {formatMoney(totalHSAHealthcare)} healthcare tax-free
                                </div>
                            )}
                        </div>
                    }
                    color="purple"
                />

                <MetricCard
                    icon={<Calendar className="w-6 h-6" />}
                    title="Critical Ages"
                    value={
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Retirement:</span>
                                <span className="font-semibold">Age {personal.retirementAge}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Medicare:</span>
                                <span className="font-semibold">Age 65</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Social Security:</span>
                                <span className="font-semibold">Age {inputs.income.socialSecurity.claimingAge}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">RMDs Begin:</span>
                                <span className="font-semibold">Age {RMD_START_AGE}</span>
                            </div>
                        </div>
                    }
                    color="orange"
                />
            </div>
        </div>
    );
}

interface MetricCardProps {
    icon: React.ReactNode;
    title: string;
    value: React.ReactNode;
    subtitle?: string;
    color: 'blue' | 'green' | 'purple' | 'orange';
}

function MetricCard({ icon, title, value, subtitle, color }: MetricCardProps) {
    const colorClasses = {
        blue: 'bg-blue-50 border-blue-200 text-blue-600',
        green: 'bg-green-50 border-green-200 text-green-600',
        purple: 'bg-purple-50 border-purple-200 text-purple-600',
        orange: 'bg-orange-50 border-orange-200 text-orange-600',
    };

    return (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-3">
                <div className={`inline-flex p-3 rounded-lg ${colorClasses[color]}`}>
                    {icon}
                </div>
                <h4 className="text-base font-semibold text-gray-800">{title}</h4>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
                {typeof value === 'string' || typeof value === 'number' ? value : value}
            </div>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
    );
}

interface OutcomeCardProps {
    label: string;
    subtitle: string;
    value: number;
    color: 'orange' | 'blue' | 'green';
    context?: string;
}

function OutcomeCard({ label, subtitle, value, color, context }: OutcomeCardProps) {
    const colorClasses = {
        orange: 'border-orange-300 bg-orange-50',
        blue: 'border-blue-300 bg-blue-50',
        green: 'border-green-300 bg-green-50',
    };

    const textColorClasses = {
        orange: 'text-orange-700',
        blue: 'text-blue-700',
        green: 'text-green-700',
    };

    return (
        <div className={`border-2 ${colorClasses[color]} rounded-lg p-4 text-center`}>
            {/* Primary label (plain language) */}
            <div className="text-sm font-semibold text-gray-900 mb-1">{label}</div>
            {/* Subtitle (statistical term) */}
            <div className="text-xs text-gray-500 mb-2">{subtitle}</div>
            <div className={`text-3xl font-bold ${textColorClasses[color]} mb-1`}>
                {value === 0 ? '$0' : formatMoney(value)}
            </div>
            {context && (
                <div className="text-xs text-gray-600 mt-2 italic">
                    {context}
                </div>
            )}
        </div>
    );
}