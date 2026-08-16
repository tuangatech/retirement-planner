// src/components/results/AnnualTable.tsx - Clean Table + Detailed CSV Export

import { useState, useMemo } from 'react';
import { Download, FileJson, Info, TrendingUp, AlertCircle, Calendar, DollarSign } from 'lucide-react';
import type { SimulationResults } from '@/types'
import type { UserInputs } from '@/types';
import type { YearlyProjection } from '@/lib/calculations/yearlyProjection';
import { formatMoney } from '@/lib/format';
import { exportVerificationBundle } from '@/lib/exportVerification';
import { RMD_START_AGE } from '@/lib/calculations/rmd';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

interface AnnualTableProps {
    results: SimulationResults;
    inputs: UserInputs;
}

// Visual styling for each retirement phase. Color encodes activity/spending level
// (Go-Go highest → No-Go lowest). The leftmost column is a thin colored "spine": one
// merged rowSpan cell per contiguous phase. The color is the only cue in the table, so
// a legend + hover tooltip carry the meaning (accessibility). Order: green → amber → slate.
const PHASE_META: Record<string, { label: string; rail: string }> = {
    working: { label: 'Working', rail: 'bg-slate-400' },
    go_go: { label: 'Go-Go', rail: 'bg-green-400' },
    slow_go: { label: 'Slow-Go', rail: 'bg-amber-400' },
    no_go: { label: 'No-Go', rail: 'bg-slate-300' },
};

interface Insight {
    type: 'positive' | 'info' | 'warning' | 'event';
    icon: React.ReactNode;
    title: string;
    description: string;
    ageRange?: string;
}

export default function AnnualTable({ results, inputs }: AnnualTableProps) {
    const [selectedPercentile, setSelectedPercentile] = useState<'p10' | 'p50' | 'p90'>('p50');

    const projections = results.selectedRuns[selectedPercentile].projections;

    // Generate smart insights
    const insights = useMemo(() => generateInsights(projections, inputs), [projections, inputs]);

    // Age at which the (funded) HSA first depletes — drives the 💊 marker. Mirrors the
    // HSA-depletion insight: only for an HSA that started funded, and not the very first year.
    const hsaFunded = inputs.accounts.hsa.balanceAtRetirement > 0;
    const hsaDepletionAge = useMemo(() => {
        if (!hsaFunded) return null;
        const idx = projections.findIndex(p => p.portfolio.balances.hsa < 100);
        return idx > 0 ? projections[idx].age : null;
    }, [projections, hsaFunded]);

    // MFJ shows the spouse's age alongside the primary's (derived: spouse ages in
    // lockstep with the primary). Events are keyed to the primary's age only.
    const isMFJ = inputs.personal.filingStatus === 'married_joint';
    const spouseAgeAtRetirement = inputs.personal.spouseAgeAtRetirement;

    // Contiguous phase groups for the merged Phase column: startIndex → number of rows
    // to span. Each phase renders as one tinted band with a single centered label.
    const phaseGroupSpan = useMemo(() => {
        const spans: Record<number, number> = {};
        let i = 0;
        while (i < projections.length) {
            let j = i + 1;
            while (j < projections.length && projections[j].phase === projections[i].phase) j++;
            spans[i] = j - i;
            i = j;
        }
        return spans;
    }, [projections]);

    const exportToCSV = () => {
        // Comprehensive CSV: all account details for spreadsheet analysis
        const headers = [
            // Timeline
            'Age', 'Year', 'Phase',
            // Income breakdown
            'Social Security', 'Pensions', 'Part-Time Work', 'Rental Income', 'Total Income',
            // Expenses breakdown
            'Living Expenses', 'Healthcare Premiums', 'Healthcare Out-of-Pocket', 'One-Time Expenses', 'Total Expenses',
            // Taxes breakdown
            'Income Tax', 'Payroll Tax', 'Withdrawal Tax', 'State Tax', 'Total Tax',
            // Withdrawals by account
            'Tax-Deferred Withdrawal', 'Roth Withdrawal', 'Taxable Withdrawal', 'HSA Withdrawal', 'Total Withdrawals',
            // HSA details
            'HSA Healthcare Coverage (Tax-Free)', 'HSA Balance',
            // All account balances
            'Tax-Deferred Balance', 'Roth Balance', 'Taxable Balance', 'Total Portfolio',
            // Summary
            'Net Cash Flow', 'RMD Amount', 'Shortfall'
        ];

        const rows = projections.map(p => [
            // Timeline
            p.age,
            p.year,
            p.phase,
            // Income
            p.income.socialSecurity.toFixed(0),
            p.income.pensions.toFixed(0),
            p.income.partTimeWork.toFixed(0),
            p.income.rentalIncome.toFixed(0),
            p.income.totalBeforeWithdrawals.toFixed(0),
            // Expenses
            p.expenses.living.toFixed(0),
            p.expenses.healthcarePremiums.toFixed(0),
            p.expenses.healthcareOutOfPocket.toFixed(0),
            p.expenses.oneTimeExpenses.toFixed(0),
            p.expenses.total.toFixed(0),
            // Taxes
            p.taxes.onFixedIncome.toFixed(0),
            p.taxes.payrollTax.toFixed(0),
            p.taxes.onWithdrawals.toFixed(0),
            p.taxes.stateTax.toFixed(0),
            p.taxes.total.toFixed(0),
            // Withdrawals
            p.portfolio.withdrawals.taxDeferred.toFixed(0),
            p.portfolio.withdrawals.roth.toFixed(0),
            p.portfolio.withdrawals.taxable.toFixed(0),
            p.portfolio.withdrawals.hsa.toFixed(0),
            p.portfolio.withdrawals.total.toFixed(0),
            // HSA
            p.portfolio.hsaForHealthcare.toFixed(0),
            p.portfolio.balances.hsa.toFixed(0),
            // Balances
            p.portfolio.balances.taxDeferred.toFixed(0),
            p.portfolio.balances.roth.toFixed(0),
            p.portfolio.balances.taxable.toFixed(0),
            p.portfolio.balances.total.toFixed(0),
            // Summary
            p.netCashFlow.toFixed(0),
            p.portfolio.rmdAmount.toFixed(0),
            p.shortfall.toFixed(0),
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `retirement-plan-${selectedPercentile}-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div>
                        <h3 className="text-lg font-semibold">Annual Breakdown</h3>
                        <p className="text-sm text-gray-600">Year-by-year overview (export CSV for detailed account breakdowns)</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={selectedPercentile}
                            onChange={(e) => setSelectedPercentile(e.target.value as 'p10' | 'p50' | 'p90')}
                            className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="p10">10th Percentile (Worst Case)</option>
                            <option value="p50">Median (50th Percentile)</option>
                            <option value="p90">90th Percentile (Best Case)</option>
                        </select>

                        <button
                            onClick={exportToCSV}
                            title="Export the selected percentile's year-by-year breakdown as a CSV spreadsheet"
                            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            CSV
                        </button>

                        <button
                            onClick={() => exportVerificationBundle(results, inputs)}
                            title="Download a JSON bundle with all inputs, settings, and p10/p50/p90 results for verify_plan.py"
                            className="flex items-center gap-2 px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            <FileJson className="w-4 h-4" />
                            JSON
                        </button>
                    </div>
                </div>

                {/* 8 columns for easy scanning */}
                <TooltipProvider delayDuration={100}>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm table-fixed">
                        {/* Thin phase spine + Age; the 5 money columns share the rest equally */}
                        <colgroup>
                            <col className="w-[5px]" />
                            <col className="w-[13%]" />
                            <col />
                            <col />
                            <col />
                            <col />
                            <col />
                        </colgroup>
                        <thead className="bg-gray-50 border-b-2 border-gray-200">
                            <tr>
                                <th className="sticky left-0 bg-gray-50 p-0" aria-label="Life phase" />
                                <th className="sticky left-[5px] bg-gray-50 px-4 py-3 text-left font-semibold">
                                    {isMFJ && spouseAgeAtRetirement != null ? (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="inline-flex items-center gap-1 cursor-help underline decoration-dotted decoration-gray-400/60 underline-offset-4">
                                                    Age
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-[16rem]">
                                                Your age | your spouse&apos;s age. At retirement you&apos;re {inputs.personal.retirementAge} and your spouse is {spouseAgeAtRetirement}. Event markers below follow your (primary) age.
                                            </TooltipContent>
                                        </Tooltip>
                                    ) : 'Age'}
                                </th>
                                <th className="px-4 py-3 text-right font-semibold">Income</th>
                                <th className="px-4 py-3 text-right font-semibold">Expenses</th>
                                <th className="px-4 py-3 text-right font-semibold">Taxes</th>
                                <th className="px-4 py-3 text-right font-semibold">Withdrawals</th>
                                <th className="px-4 py-3 text-right font-semibold">Portfolio</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {projections.map((p, index) => {
                                const isRetirement = p.age === inputs.personal.retirementAge;
                                const isMedicare = p.age === 65;
                                const isSSStart = p.age === inputs.income.socialSecurity.claimingAge;
                                const isRMD = p.age === RMD_START_AGE;
                                const isHSADepleted = hsaDepletionAge !== null && p.age === hsaDepletionAge;
                                const hasEvent = isRetirement || isMedicare || isSSStart || isRMD || isHSADepleted;
                                // Once the portfolio is depleted, expenses beyond income are unfunded — surface
                                // the gap so the table doesn't look like it silently keeps paying the bills.
                                const hasShortfall = p.shortfall > 0.5;

                                const zebra = index % 2 === 1 ? 'bg-gray-50' : 'bg-white';
                                const phaseMeta = PHASE_META[p.phase] ?? PHASE_META.go_go;
                                const phaseSpan = phaseGroupSpan[index]; // set only on a group's first row

                                return (
                                    <tr
                                        key={index}
                                        className={`${zebra} hover:bg-blue-50/40`}
                                    >
                                        {/* Phase spine — thin colored bar, one merged cell per contiguous phase */}
                                        {phaseSpan && (
                                            <td rowSpan={phaseSpan} className={`sticky left-0 p-0 relative ${phaseMeta.rail}`}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button type="button" aria-label={`${phaseMeta.label} phase`} className="absolute inset-0 w-full h-full cursor-help" />
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right">{phaseMeta.label}</TooltipContent>
                                                </Tooltip>
                                            </td>
                                        )}

                                        {/* Age with event markers */}
                                        <td className={`sticky left-[5px] px-4 py-3 font-medium ${zebra}`}>
                                            {p.age}
                                            {isMFJ && spouseAgeAtRetirement != null && (
                                                <span className="text-gray-400 font-normal"> | {spouseAgeAtRetirement + (p.age - inputs.personal.retirementAge)}</span>
                                            )}
                                            {(hasEvent || hasShortfall) && (
                                                <TooltipProvider delayDuration={100}>
                                                    <div className="text-xs text-blue-600 font-normal flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                                                        {isRetirement && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="inline-flex items-center gap-0.5 cursor-help">🎂 Retire</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Retirement begins (age {inputs.personal.retirementAge})</TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                        {isMedicare && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="inline-flex items-center gap-0.5 cursor-help">🏥 Medicare</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Medicare starts (age 65)</TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                        {isSSStart && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="inline-flex items-center gap-0.5 cursor-help">💰 SS</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Social Security starts (age {inputs.income.socialSecurity.claimingAge})</TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                        {isRMD && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="inline-flex items-center gap-0.5 cursor-help">📊 RMDs</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Required Minimum Distributions begin (age {RMD_START_AGE})</TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                        {isHSADepleted && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="inline-flex items-center gap-0.5 cursor-help">💊 Depleted</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>HSA depleted (age {hsaDepletionAge})</TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                        {hasShortfall && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="inline-flex items-center gap-0.5 cursor-help text-red-600 font-medium">⚠️ Underfunded</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Expenses exceed income by {formatMoney(p.shortfall)} and the portfolio is depleted — this year is unfunded.</TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                </TooltipProvider>
                                            )}
                                        </td>

                                        {/* Income */}
                                        <BreakdownCell
                                            value={p.income.totalBeforeWithdrawals}
                                            className="text-green-700 font-medium"
                                            emptyText="No income this year"
                                            lines={[
                                                { label: 'Social Security', value: p.income.socialSecurity },
                                                { label: 'Pensions', value: p.income.pensions },
                                                { label: 'Part-time work', value: p.income.partTimeWork },
                                                { label: 'Rental income', value: p.income.rentalIncome },
                                            ]}
                                        />

                                        {/* Expenses */}
                                        <BreakdownCell
                                            value={p.expenses.total}
                                            className="text-red-700 font-medium"
                                            lines={[
                                                { label: 'Living expenses', value: p.expenses.living },
                                                { label: 'Healthcare premiums', value: p.expenses.healthcarePremiums },
                                                { label: 'Healthcare out-of-pocket', value: p.expenses.healthcareOutOfPocket },
                                                { label: 'One-time expenses', value: p.expenses.oneTimeExpenses },
                                            ]}
                                        />

                                        {/* Taxes */}
                                        <BreakdownCell
                                            value={p.taxes.total}
                                            className="text-orange-700 font-medium"
                                            emptyText="No tax this year"
                                            lines={[
                                                { label: 'Income tax', value: p.taxes.onFixedIncome },
                                                { label: 'Withdrawal tax', value: p.taxes.onWithdrawals },
                                                { label: 'Payroll tax', value: p.taxes.payrollTax },
                                                { label: 'State tax', value: p.taxes.stateTax },
                                            ]}
                                        />

                                        {/* Withdrawals */}
                                        <BreakdownCell
                                            value={p.portfolio.withdrawals.total}
                                            className="text-purple-700 font-medium"
                                            emptyText="No withdrawals this year"
                                            lines={[
                                                { label: 'Tax-deferred', value: p.portfolio.withdrawals.taxDeferred },
                                                { label: 'Roth', value: p.portfolio.withdrawals.roth },
                                                { label: 'Taxable', value: p.portfolio.withdrawals.taxable },
                                                { label: 'HSA', value: p.portfolio.withdrawals.hsa },
                                            ]}
                                            notes={[
                                                ...(p.portfolio.rmdAmount > 0.5
                                                    ? [`Includes required RMD of ${formatMoney(p.portfolio.rmdAmount)}`]
                                                    : []),
                                                ...(p.portfolio.hsaForHealthcare > 0.5
                                                    ? ['HSA used tax-free for healthcare']
                                                    : []),
                                            ]}
                                        />

                                        {/* Portfolio Balance — show a clean $0 once depleted (sub-dollar
                                            residuals otherwise round up to a misleading "$1"). */}
                                        <BreakdownCell
                                            value={p.portfolioDepleted ? 0 : p.portfolio.balances.total}
                                            totalLabel="Total portfolio"
                                            emptyText="Portfolio depleted"
                                            minValue={1000}
                                            className={`font-semibold ${p.portfolio.balances.total < 100000 ? 'text-red-600' :
                                                p.portfolio.balances.total > 1000000 ? 'text-green-600' :
                                                    'text-gray-900'
                                                }`}
                                            lines={[
                                                { label: 'Tax-deferred', value: p.portfolio.balances.taxDeferred },
                                                { label: 'Roth', value: p.portfolio.balances.roth },
                                                { label: 'Taxable', value: p.portfolio.balances.taxable },
                                                { label: 'HSA', value: p.portfolio.balances.hsa },
                                            ]}
                                        />
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                </TooltipProvider>
            </div>

            {/* Column Explanations Panel */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-5">
                <div className="flex items-start gap-3 mb-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <h4 className="font-semibold text-blue-900">📊 Understanding This Table</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm text-blue-800">
                    <div>
                        <span className="font-semibold">Income:</span> Total income before portfolio withdrawals (Social Security, pensions, work, rental)
                    </div>
                    <div>
                        <span className="font-semibold">Expenses:</span> Total spending (living costs, healthcare, one-time expenses)
                    </div>
                    <div>
                        <span className="font-semibold">Taxes:</span> All taxes paid (income tax, payroll tax, withdrawal tax)
                    </div>
                    <div>
                        <span className="font-semibold">Withdrawals:</span> Total from all accounts (tax-deferred, Roth, taxable, HSA)
                    </div>
                    <div>
                        <span className="font-semibold">Portfolio:</span> Combined balance of all investment accounts
                    </div>
                </div>

                <div className="mt-3 pt-3 border-t border-blue-300 text-xs text-blue-700">
                    <strong>💡 Tip:</strong> Hover any Income, Expenses, Taxes, Withdrawals, or Portfolio
                    figure to see the items that make it up. Export to CSV for the full account-by-account
                    breakdown including HSA balance, healthcare coverage, RMDs, and more.
                </div>
            </div>

            {/* Smart Insights Panel */}
            {insights.length > 0 && (
                <div className="bg-white border-2 border-gray-200 rounded-lg p-5">
                    <div className="flex items-start gap-3 mb-4">
                        <TrendingUp className="w-5 h-5 text-gray-700 flex-shrink-0 mt-0.5" />
                        <h4 className="font-semibold text-gray-900">💡 Key Insights from Your Plan</h4>
                    </div>

                    <div className="space-y-3">
                        {insights.map((insight, index) => (
                            <InsightCard key={index} insight={insight} />
                        ))}
                    </div>
                </div>
            )}

            {/* Phase Legend — decodes the left color spine */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2 text-sm">Life Phases (left color bar):</h4>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-700">
                    <span className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm bg-green-400" />Go-Go — active early years</span>
                    <span className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm bg-amber-400" />Slow-Go — slowing down</span>
                    <span className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm bg-slate-300" />No-Go — later years</span>
                </div>
            </div>

            {/* Event Legend */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2 text-sm">Event Markers in Table:</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm text-gray-700">
                    <div>🎂 = Retirement Begins</div>
                    <div>🏥 = Medicare Starts (Age 65)</div>
                    <div>💰 = Social Security Starts</div>
                    <div>📊 = RMDs Begin (Age {RMD_START_AGE})</div>
                    {inputs.accounts.hsa.balanceAtRetirement > 0 && (
                        <div>💊 = HSA Depleted</div>
                    )}
                </div>
                {isMFJ && (
                    <p className="text-xs text-gray-500 mt-2">Event markers follow your (primary) age, not your spouse&apos;s.</p>
                )}
            </div>
        </div>
    );
}

// Per-row breakdown cell: shows the figure with a hover tooltip itemizing the
// components that sum to it. Non-zero components only; empty years show emptyText.
interface BreakdownLine {
    label: string;
    value: number;
}

function BreakdownCell({
    value,
    className,
    lines,
    notes,
    emptyText,
    totalLabel = 'Total',
    minValue = 0.5,
}: {
    value: number;
    className: string;
    lines: BreakdownLine[];
    notes?: string[];
    emptyText?: string;
    totalLabel?: string;
    // Line items with |value| below this are hidden (e.g. sub-$1,000 residual balances).
    minValue?: number;
}) {
    const shown = lines.filter((l) => Math.abs(l.value) >= minValue);

    return (
        <td className={`px-4 py-3 text-right ${className}`}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="cursor-help underline decoration-dotted decoration-gray-400/60 underline-offset-4">
                        {formatMoney(value)}
                    </span>
                </TooltipTrigger>
                <TooltipContent className="text-left max-w-[15rem]">
                    {shown.length === 0 ? (
                        <div>{emptyText ?? 'No components'}</div>
                    ) : (
                        <div className="space-y-1">
                            {shown.map((l, i) => (
                                <div key={i} className="flex justify-between gap-6">
                                    <span className="opacity-70">{l.label}</span>
                                    <span className="font-medium tabular-nums">{formatMoney(l.value)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between gap-6 border-t border-primary-foreground/30 pt-1 mt-1">
                                <span>{totalLabel}</span>
                                <span className="font-semibold tabular-nums">{formatMoney(value)}</span>
                            </div>
                            {notes?.map((n, i) => (
                                <div key={i} className="opacity-70 italic pt-0.5">{n}</div>
                            ))}
                        </div>
                    )}
                </TooltipContent>
            </Tooltip>
        </td>
    );
}

// Insight Card Component
function InsightCard({ insight }: { insight: Insight }) {
    const colorClasses = {
        positive: 'bg-green-50 border-green-300 text-green-800',
        info: 'bg-blue-50 border-blue-300 text-blue-800',
        warning: 'bg-yellow-50 border-yellow-300 text-yellow-800',
        event: 'bg-purple-50 border-purple-300 text-purple-800',
    };

    const iconColorClasses = {
        positive: 'text-green-600',
        info: 'text-blue-600',
        warning: 'text-yellow-600',
        event: 'text-purple-600',
    };

    return (
        <div className={`border-l-4 ${colorClasses[insight.type]} rounded-r-lg p-4`}>
            <div className="flex items-start gap-3">
                <div className={iconColorClasses[insight.type]}>
                    {insight.icon}
                </div>
                <div className="flex-1">
                    <div className="font-semibold mb-1">
                        {insight.title}
                        {insight.ageRange && (
                            <span className="ml-2 text-xs font-normal opacity-75">
                                {insight.ageRange}
                            </span>
                        )}
                    </div>
                    <div className="text-sm opacity-90">
                        {insight.description}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Smart Insights Generation Function
function generateInsights(projections: YearlyProjection[], inputs: UserInputs): Insight[] {
    const insights: Insight[] = [];

    // 1. Zero Withdrawal Period Detection
    const firstWithdrawalIndex = projections.findIndex(p => p.portfolio.withdrawals.total > 100);
    if (firstWithdrawalIndex > 0) {
        const firstWithdrawalAge = projections[firstWithdrawalIndex].age;
        const zeroWithdrawalYears = firstWithdrawalAge - inputs.personal.retirementAge;

        insights.push({
            type: 'positive',
            icon: <AlertCircle className="w-5 h-5" />,
            title: 'No withdrawals needed in early retirement!',
            ageRange: `Ages ${inputs.personal.retirementAge}-${firstWithdrawalAge - 1}`,
            description: `Your income plus portfolio returns cover all expenses for the first ${zeroWithdrawalYears} years. Your portfolio actually grows during this period, providing a strong foundation for later years.`
        });
    }

    // 2. Medicare Start (Age 65)
    const medicareIndex = projections.findIndex(p => p.age === 65);
    if (medicareIndex > 0 && medicareIndex < projections.length - 1) {
        const preMedicareHealthcare =
            projections[medicareIndex - 1].expenses.healthcarePremiums +
            projections[medicareIndex - 1].expenses.healthcareOutOfPocket;
        const medicareHealthcare =
            projections[medicareIndex].expenses.healthcarePremiums +
            projections[medicareIndex].expenses.healthcareOutOfPocket;
        const healthcareDrop = preMedicareHealthcare - medicareHealthcare;

        if (healthcareDrop > 1000) {
            insights.push({
                type: 'info',
                icon: <Calendar className="w-5 h-5" />,
                title: 'Medicare eligibility begins',
                ageRange: 'Age 65',
                description: `Healthcare costs decrease by approximately ${(healthcareDrop / 1000).toFixed(1)}K/year as you transition from private insurance to Medicare coverage. This improves your cash flow and reduces pressure on your portfolio.`
            });
        } else if (healthcareDrop < -1000) {
            insights.push({
                type: 'warning',
                icon: <AlertCircle className="w-5 h-5" />,
                title: 'Medicare begins with higher costs',
                ageRange: 'Age 65',
                description: `Healthcare costs increase by approximately ${(Math.abs(healthcareDrop) / 1000).toFixed(1)}K/year, likely due to higher out-of-pocket expenses or IRMAA surcharges. Consider reviewing your Medicare coverage options.`
            });
        }
    }

    // 3. Social Security Start
    const ssClaimingAge = inputs.income.socialSecurity.claimingAge;
    const ssStartIndex = projections.findIndex(p => p.age === ssClaimingAge);
    if (ssStartIndex >= 0) {
        const ssAmount = projections[ssStartIndex].income.socialSecurity;
        const earningsReduction = projections[ssStartIndex].income.socialSecurityReduction;

        if (earningsReduction > 100) {
            insights.push({
                type: 'warning',
                icon: <AlertCircle className="w-5 h-5" />,
                title: 'Social Security starts with earnings penalty',
                ageRange: `Age ${ssClaimingAge}`,
                description: `Your benefit of ${(ssAmount / 1000).toFixed(1)}K/year is reduced by ${(earningsReduction / 1000).toFixed(1)}K due to the earnings test (you're working while claiming before age 67). Consider delaying your claim or reducing work hours.`
            });
        } else {
            insights.push({
                type: 'info',
                icon: <Calendar className="w-5 h-5" />,
                title: 'Social Security begins',
                ageRange: `Age ${ssClaimingAge}`,
                description: `You start receiving approximately ${(ssAmount / 1000).toFixed(1)}K/year in Social Security benefits${ssClaimingAge < 67 ? ' (reduced for early claiming)' : ssClaimingAge > 67 ? ' (increased for delayed claiming)' : ' (at full retirement age)'}. This provides a reliable income floor for the rest of your life.`
            });
        }
    }

    // 4. RMD Start (age 75) — find the first year an RMD is actually forced.
    const rmdIndex = projections.findIndex(p => p.portfolio.rmdAmount > 0.5);
    if (rmdIndex >= 0) {
        const rmdAmount = projections[rmdIndex].portfolio.rmdAmount;
        const rmdTax = projections[rmdIndex].taxes.onWithdrawals;
        const withdrawal = projections[rmdIndex].portfolio.withdrawals.total;

        if (rmdAmount > 100) {
            insights.push({
                type: 'warning',
                icon: <AlertCircle className="w-5 h-5" />,
                title: 'Required Minimum Distributions (RMDs) begin',
                ageRange: `Age ${projections[rmdIndex].age}+`,
                description: `The IRS requires you to withdraw at least ${(rmdAmount / 1000).toFixed(1)}K/year from tax-deferred accounts and pay approximately ${(rmdTax / 1000).toFixed(1)}K in taxes. ${withdrawal > rmdAmount * 1.1 ? 'You need additional withdrawals beyond the RMD to cover expenses.' : 'You don\'t need this money for expenses, so after-tax proceeds get reinvested to your taxable account.'}`
            });
        }
    }

    // 5. HSA Depletion Detection
    const hsaDepletionIndex = projections.findIndex(p => p.portfolio.balances.hsa < 100);
    if (hsaDepletionIndex > 0 && inputs.accounts.hsa.balanceAtRetirement > 0) {
        const depletionYear = projections[hsaDepletionIndex];
        const yearsOfCoverage = depletionYear.age - inputs.personal.retirementAge;

        insights.push({
            type: 'info',
            icon: <Calendar className="w-5 h-5" />,
            title: 'HSA provides tax-free healthcare coverage',
            ageRange: `Ages ${inputs.personal.retirementAge}-${depletionYear.age}`,
            description: `Your HSA covers healthcare tax-free for ${yearsOfCoverage} years. After depletion at age ${depletionYear.age}, healthcare costs shift to other accounts (taxed).`
        });
    }

    // 6. One-Time Expenses Detection
    const oneTimeExpenses = projections.filter(p => p.expenses.oneTimeExpenses > 5000);
    oneTimeExpenses.forEach(p => {
        const expense = inputs.oneTimeExpenses.find(e => e.age === p.age);
        if (expense) {
            insights.push({
                type: 'event',
                icon: <Calendar className="w-5 h-5" />,
                title: `One-time expense: ${expense.description}`,
                ageRange: `Age ${p.age}`,
                description: `Planned expense of ${(expense.amount / 1000).toFixed(1)}K (inflated to ${(p.expenses.oneTimeExpenses / 1000).toFixed(1)}K in future dollars). This creates a temporary spike in expenses and may require larger portfolio withdrawals this year.`
            });
        }
    });

    // 7. Part-Time Work Detection
    if (inputs.income.partTimeWork.enabled) {
        const workStartIndex = projections.findIndex(p => p.age === inputs.income.partTimeWork.startAge);

        if (workStartIndex >= 0) {
            const workIncome = projections[workStartIndex].income.partTimeWork;
            insights.push({
                type: 'info',
                icon: <DollarSign className="w-5 h-5" />,
                title: 'Part-time work begins',
                ageRange: `Ages ${inputs.income.partTimeWork.startAge}-${inputs.income.partTimeWork.endAge}`,
                description: `You earn approximately ${(workIncome / 1000).toFixed(1)}K/year from part-time work. This supplemental income reduces portfolio withdrawals and extends your plan's sustainability.`
            });
        }
    }

    // 8. Portfolio Growth Detection (first 5 years)
    if (projections.length >= 5) {
        const startPortfolio = projections[0].portfolio.balances.total;
        const year5Portfolio = projections[4].portfolio.balances.total;
        const portfolioGrowth = year5Portfolio - startPortfolio;

        if (portfolioGrowth > startPortfolio * 0.1) {
            insights.push({
                type: 'positive',
                icon: <TrendingUp className="w-5 h-5" />,
                title: 'Portfolio grows in early retirement',
                ageRange: 'First 5 years',
                description: `Your portfolio increases by approximately ${(portfolioGrowth / 1000).toFixed(0)}K (${((portfolioGrowth / startPortfolio) * 100).toFixed(0)}%) during early retirement. Market returns exceed withdrawals, strengthening your financial position.`
            });
        }
    }

    return insights;
}