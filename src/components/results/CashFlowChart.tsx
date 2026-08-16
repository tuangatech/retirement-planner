// src/components/results/CashFlowChart.tsx - Complete Redesign with Improvements

import { useMemo } from 'react';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import type { SimulationResults } from '@/types'
import type { UserInputs } from '@/types';
import { formatMoney } from '@/lib/format';
import { RMD_START_AGE } from '@/lib/calculations/rmd';

interface CashFlowChartProps {
    results: SimulationResults;
    inputs: UserInputs;
}

// Legend order is pinned here rather than inherited from Recharts' `payload`. That order is
// an internal detail: Recharts 2 emitted series-declaration order, v3 emits it alphabetised,
// which silently demoted Social Security — the largest income line — to last place. Pinning
// keeps the legend reading in the same order the bars stack.
const LEGEND_ORDER = [
    'Social Security', 'Pensions', 'Part-Time Work', 'Rental Income',
    'Living Expenses', 'Healthcare', 'Taxes', 'One-Time', 'Typical (Median)', 'HSA Balance',
];

const INCOME_SERIES = ['Social Security', 'Pensions', 'Part-Time Work', 'Rental Income'];

const byLegendOrder = (a: { value: string }, b: { value: string }) => {
    const rank = (v: string) => {
        const i = LEGEND_ORDER.indexOf(v);
        return i === -1 ? Number.MAX_SAFE_INTEGER : i;  // unknown series sort last
    };
    return rank(a.value) - rank(b.value);
};

export default function CashFlowChart({ results, inputs }: CashFlowChartProps) {
    const successRate = results.successRate * 100;

    const chartData = useMemo(() => {
        const medianProjections = results.selectedRuns.p50.projections;
        const p10Projections = results.selectedRuns.p10.projections;
        const p90Projections = results.selectedRuns.p90.projections;

        // Create lookup maps by age
        const p10ByAge = new Map(
            p10Projections.map(p => [p.age, p.portfolio.balances.total])
        );
        const p90ByAge = new Map(
            p90Projections.map(p => [p.age, p.portfolio.balances.total])
        );

        return medianProjections.map((projection) => ({
            age: projection.age,

            // Income (stacked)
            socialSecurity: projection.income.socialSecurity,
            pensions: projection.income.pensions,
            work: projection.income.partTimeWork,
            rental: projection.income.rentalIncome,

            // Expenses (stacked, negative for visual separation)
            living: -projection.expenses.living,
            healthcare: -projection.expenses.healthcarePremiums - projection.expenses.healthcareOutOfPocket,
            taxes: -projection.taxes.total,
            oneTime: -projection.expenses.oneTimeExpenses,

            // Portfolio balance lines - lookup by age, not index
            balance: projection.portfolio.balances.total,
            balanceP10: p10ByAge.get(projection.age) ?? 0,
            balanceP90: p90ByAge.get(projection.age) ?? 0,

            // HSA-specific data
            hsaBalance: projection.portfolio.balances.hsa,
            hsaWithdrawal: projection.portfolio.withdrawals.hsa,
            hsaForHealthcare: projection.portfolio.hsaForHealthcare,

            // Event markers
            isRetirement: projection.age === inputs.personal.retirementAge,
            isMedicare: projection.age === 65,
            isSocialSecurity: projection.age === inputs.income.socialSecurity.claimingAge,
            isRMD: projection.age === RMD_START_AGE,
        }));
    }, [results, inputs]);

    // Custom legend renderer for two rows with dashed HSA line
    const renderLegend = (props: any) => {
        const { payload } = props;

        // Split legend items into two categories, each in the pinned display order.
        const incomeItems = payload
            .filter((entry: any) => INCOME_SERIES.includes(entry.value))
            .sort(byLegendOrder);

        const expensePortfolioItems = payload
            .filter((entry: any) => !INCOME_SERIES.includes(entry.value))
            .sort(byLegendOrder);

        return (
            <div className="flex flex-col items-center gap-3 mt-4 px-4">
                {/* Row 1: Income Sources */}
                <div className="flex items-center justify-center flex-wrap gap-x-5 gap-y-2">
                    <span className="text-xs font-semibold text-gray-600 mr-2">INCOME:</span>
                    {incomeItems.map((entry: any, index: number) => (
                        <div key={`income-${index}`} className="flex items-center gap-1.5">
                            <div
                                className="w-3 h-3 rounded-sm"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-xs text-gray-700">{entry.value}</span>
                        </div>
                    ))}
                </div>

                {/* Row 2: Expenses & Portfolio */}
                <div className="flex items-center justify-center flex-wrap gap-x-5 gap-y-2">
                    <span className="text-xs font-semibold text-gray-600 mr-2">EXPENSES & PORTFOLIO:</span>
                    {expensePortfolioItems.map((entry: any, index: number) => (
                        <div key={`expense-${index}`} className="flex items-center gap-1.5">
                            {entry.type === 'line' ? (
                                // Dashed line for HSA in legend
                                <svg width="16" height="12" className="flex-shrink-0">
                                    <line
                                        x1="0"
                                        y1="6"
                                        x2="16"
                                        y2="6"
                                        stroke={entry.color}
                                        strokeWidth="2"
                                        strokeDasharray={
                                            entry.value === 'HSA Balance' ? '3 3' :
                                                entry.value.includes('Worst') || entry.value.includes('Best') ? '3 3' : '0'
                                        }
                                    />
                                </svg>
                            ) : (
                                <div
                                    className="w-3 h-3 rounded-sm"
                                    style={{ backgroundColor: entry.color }}
                                />
                            )}
                            <span className="text-xs text-gray-700">{entry.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-1">Annual Cash Flow & Portfolio Balance</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Income sources (above zero) vs. Expenses (below zero), with portfolio balance trend lines
                </p>

                {/* Warning for gap years */}
                {inputs.income.socialSecurity.claimingAge > inputs.personal.retirementAge && successRate < 75 && (
                    <div className="mb-4 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                        <p className="text-sm font-semibold text-yellow-900 mb-1">
                            ⚠️ Income Gap Detected
                        </p>
                        <p className="text-sm text-yellow-800">
                            You have a {inputs.income.socialSecurity.claimingAge - inputs.personal.retirementAge}-year gap
                            (ages {inputs.personal.retirementAge}-{inputs.income.socialSecurity.claimingAge}) with no Social Security income.
                            This period shows high portfolio withdrawals and is a major risk factor.
                        </p>
                    </div>
                )}

                <ResponsiveContainer width="100%" height={500}>
                    <ComposedChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

                        <XAxis
                            dataKey="age"
                            label={{ value: 'Age', position: 'insideBottom', offset: -10 }}
                            tick={{ fontSize: 12 }}
                        />

                        <YAxis
                            yAxisId="left"
                            label={{ value: 'Cash Flow', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                            tickFormatter={(value: number) => `${formatMoney(value)}`}
                            tick={{ fontSize: 12 }}
                        />

                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            label={{ value: 'Balance', angle: 90, position: 'insideRight', style: { fontSize: 12 } }}
                            tickFormatter={(value: number) => `${formatMoney(value)}`}
                            tick={{ fontSize: 12 }}
                        />

                        <Tooltip
                            content={<CustomTooltip />}
                            cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                        />

                        {/* Custom two-row legend */}
                        <Legend
                            content={renderLegend}
                            wrapperStyle={{
                                paddingTop: '10px',
                                paddingBottom: '0px',
                            }}
                        />

                        {/* Zero line */}
                        <ReferenceLine yAxisId="left" y={0} stroke="#6b7280" strokeWidth={2} />

                        {/* Highlight depletion zone if applicable */}
                        {results.failedRuns.medianAgeOfDepletion && successRate < 75 && (
                            <ReferenceLine
                                yAxisId="right"
                                x={results.failedRuns.medianAgeOfDepletion}
                                stroke="#dc2626"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                label={{
                                    value: `Failure Age (${results.failedRuns.medianAgeOfDepletion})`,
                                    position: 'top',
                                    fill: '#dc2626',
                                    fontSize: 11,
                                    // fontWeight: 'bold',
                                }}
                            />
                        )}

                        {/* Income bars with SOFTER colors */}
                        <Bar yAxisId="left" dataKey="socialSecurity" stackId="income" fill="#3b82f6" name="Social Security" />
                        <Bar yAxisId="left" dataKey="pensions" stackId="income" fill="#10b981" name="Pensions" />
                        <Bar yAxisId="left" dataKey="work" stackId="income" fill="#a855f7" name="Part-Time Work" />
                        <Bar yAxisId="left" dataKey="rental" stackId="income" fill="#f59e0b" name="Rental Income" />

                        {/* Expense bars with SOFTER, DISTINCT colors */}
                        <Bar yAxisId="left" dataKey="living" stackId="expenses" fill="#f87171" name="Living Expenses" />
                        <Bar yAxisId="left" dataKey="healthcare" stackId="expenses" fill="#ec4899" name="Healthcare" />
                        <Bar yAxisId="left" dataKey="taxes" stackId="expenses" fill="#fb923c" name="Taxes" />
                        <Bar yAxisId="left" dataKey="oneTime" stackId="expenses" fill="#facc15" name="One-Time" />

                        {/* Portfolio balance — median only; the P10/P90 spread stays available on hover */}
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="balance"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={false}
                            name="Typical (Median)"
                            opacity={1.0}
                        />

                        {/* HSA balance line (teal, dashed, subtle) */}
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="hsaBalance"
                            stroke="#14b8a6"
                            strokeWidth={2}
                            strokeDasharray="3 3"
                            dot={false}
                            name="HSA Balance"
                            opacity={0.6}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Depletion Age Clarification */}
            {results.failedRuns.medianAgeOfDepletion && successRate < 75 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">📊 Understanding Depletion Ages:</h4>
                    <div className="text-sm text-blue-800 space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <span className="font-semibold">Typical Scenario (Blue Line):</span>
                                <p className="mt-1">
                                    Depletes at age{' '}
                                    {results.selectedRuns.p50.projections.find(p => p.portfolioDepleted)?.age ||
                                        inputs.personal.lifeExpectancy}
                                </p>
                            </div>
                            <div>
                                <span className="font-semibold">Typical Failure Age (Red Vertical Line):</span>
                                <p className="mt-1">
                                    Age {results.failedRuns.medianAgeOfDepletion} — half of failures occur before this age
                                </p>
                            </div>
                        </div>
                        <p className="text-xs pt-2 border-t border-blue-300">
                            💡 These are different statistics: the typical scenario's depletion age vs. the median age across all failures
                        </p>
                    </div>
                </div>
            )}

            {/* Event Legend */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Key Events:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-blue-800">
                    <div>🎂 Retirement: Age {inputs.personal.retirementAge}</div>
                    <div>🥼 Medicare: Age 65</div>
                    <div>💰 Social Security: Age {inputs.income.socialSecurity.claimingAge}</div>
                    <div>📊 RMDs Begin: Age {RMD_START_AGE}</div>
                </div>
            </div>

            {/* HSA Coverage Info */}
            {inputs.accounts.hsa.balanceAtRetirement > 0 && (
                <div className="bg-teal-50 border border-teal-300 rounded-lg p-3">
                    <p className="text-sm font-semibold text-teal-900 mb-1">
                        🥼 HSA Healthcare Coverage
                    </p>
                    <p className="text-sm text-teal-800">
                        Your {formatMoney(inputs.accounts.hsa.balanceAtRetirement)} HSA provides tax-free coverage
                        for healthcare expenses. Look for the teal dashed line showing HSA balance depletion as it pays for premiums
                        and out-of-pocket costs.
                    </p>
                </div>
            )}

            {/* Interpretation Guide for Critical Issues */}
            {successRate < 75 && (
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-900 mb-2">📊 Reading This Chart:</h4>
                    <div className="text-sm text-yellow-800 space-y-2">
                        <p>
                            <strong>Look for red flags:</strong>
                        </p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li><strong>Large expense bars</strong> (below zero) that dwarf income bars (above zero)</li>
                            <li><strong>Sharp portfolio drops</strong> (green line diving downward, red dashed line approaching zero)</li>
                            <li><strong>Years with no income bars</strong> before Social Security starts (portfolio must cover 100% of expenses)</li>
                            <li><strong>Portfolio lines approaching $0</strong> indicating depletion risk</li>
                            <li><strong>HSA depletion</strong> (teal dashed line reaching zero, forcing higher portfolio withdrawals)</li>
                        </ul>
                        <p className="pt-2 mt-2 border-t border-yellow-400">
                            💡 <strong>Key Insight:</strong> The gap between total income and total expenses must be filled by portfolio withdrawals.
                            HSA provides tax-free coverage for healthcare in early retirement, which helps preserve your other accounts.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

function CustomTooltip({ active, payload }: any) {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;

    // Get income total
    const incomeTotal =
        (data.socialSecurity || 0) +
        (data.pensions || 0) +
        (data.work || 0) +
        (data.rental || 0);

    // Get expense total (convert negative to positive)
    const expenseTotal = Math.abs(
        (data.living || 0) +
        (data.healthcare || 0) +
        (data.taxes || 0) +
        (data.oneTime || 0)
    );

    const cashFlowGap = incomeTotal - expenseTotal;

    return (
        <div className="bg-white border-2 border-gray-300 rounded-lg p-4 shadow-lg max-w-xs">
            <p className="font-bold text-gray-900 mb-2">Age {data.age}</p>

            <div className="space-y-2 text-sm">
                <div>
                    <p className="font-semibold text-green-700">Income: {formatMoney(incomeTotal)}</p>
                    {data.socialSecurity > 0 && <p className="text-gray-600 ml-2">SS: {formatMoney(data.socialSecurity)}</p>}
                    {data.pensions > 0 && <p className="text-gray-600 ml-2">Pension: {formatMoney(data.pensions)}</p>}
                    {data.work > 0 && <p className="text-gray-600 ml-2">Work: {formatMoney(data.work)}</p>}
                    {data.rental > 0 && <p className="text-gray-600 ml-2">Rental: {formatMoney(data.rental)}</p>}
                </div>

                <div>
                    <p className="font-semibold text-red-700">Expenses: {formatMoney(expenseTotal)}</p>
                    {data.living < 0 && <p className="text-gray-600 ml-2">Living: {formatMoney(Math.abs(data.living))}</p>}
                    {data.healthcare < 0 && <p className="text-gray-600 ml-2">Healthcare: {formatMoney(Math.abs(data.healthcare))}</p>}
                    {data.taxes < 0 && <p className="text-gray-600 ml-2">Taxes: {formatMoney(Math.abs(data.taxes))}</p>}
                </div>

                {/* HSA Information */}
                {data.hsaBalance > 0 && (
                    <div className="pt-2 border-t">
                        <p className="font-semibold text-teal-700">HSA: {formatMoney(data.hsaBalance)}</p>
                        {data.hsaForHealthcare > 0 && (
                            <p className="text-xs text-teal-600">
                                Covered {formatMoney(data.hsaForHealthcare)} healthcare (tax-free)
                            </p>
                        )}
                    </div>
                )}

                {cashFlowGap < 0 && (
                    <div className="pt-2 border-t">
                        <p className="text-xs text-red-700 font-semibold">
                            ⚠️ Portfolio Withdrawal Needed: {formatMoney(Math.abs(cashFlowGap))}
                        </p>
                    </div>
                )}

                <div className="pt-2 border-t">
                    <p className="font-semibold text-blue-700">Portfolio (Typical): {formatMoney(data.balance)}</p>
                    <p className="text-xs text-gray-500">Range: {formatMoney(data.balanceP10)} - {formatMoney(data.balanceP90)}</p>
                </div>
            </div>

            {(data.isRetirement || data.isMedicare || data.isSocialSecurity || data.isRMD) && (
                <div className="mt-2 pt-2 border-t text-xs text-blue-600 font-medium">
                    {data.isRetirement && '🎂 Retirement Year'}
                    {data.isMedicare && '🥼 Medicare Starts'}
                    {data.isSocialSecurity && '💰 SS Starts'}
                    {data.isRMD && '📊 RMDs Begin'}
                </div>
            )}
        </div>
    );
}