// src/components/results/RothConversionImpact.tsx
// Deterministic with-vs-without comparison of the Roth conversion plan, plus a
// stacked composition chart of Traditional vs Roth over time.

import { useMemo, useState } from 'react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    Legend,
    Line,
    ComposedChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    ReferenceLine,
} from 'recharts';
import type { UserInputs } from '@/types';
import { formatMoney } from '@/lib/format';
import { RMD_START_AGE } from '@/lib/calculations/rmd';
import { compareRothConversionImpact } from '@/lib/calculations/rothConversionImpact';
import { ArrowDownRight, ArrowUpRight, Repeat } from 'lucide-react';

interface RothConversionImpactProps {
    inputs: UserInputs;
}

function deltaColor(value: number, invert = false) {
    const good = invert ? value < 0 : value > 0;
    if (Math.abs(value) < 1) return 'text-gray-700';
    return good ? 'text-green-700' : 'text-red-700';
}

function Delta({ value, invert = false }: { value: number; invert?: boolean }) {
    const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;
    return (
        <span className={`inline-flex items-center gap-0.5 text-sm font-semibold ${deltaColor(value, invert)}`}>
            <Icon className="w-4 h-4" />
            {value >= 0 ? '+' : '−'}{formatMoney(Math.abs(value))}
        </span>
    );
}

export function RothConversionImpact({ inputs }: RothConversionImpactProps) {
    const [overlay, setOverlay] = useState(true);
    const impact = useMemo(() => compareRothConversionImpact(inputs), [inputs]);
    const endAge = inputs.personal.lifeExpectancy;
    const { withConversion: withC, withoutConversion: noC } = impact;

    const compositionData = useMemo(() => {
        return withC.projections.map((p, i) => {
            const base = noC.projections[i];
            return {
                age: p.age,
                traditional: p.portfolio.balances.taxDeferred,
                roth: p.portfolio.balances.roth,
                taxable: p.portfolio.balances.taxable,
                hsa: p.portfolio.balances.hsa,
                traditionalBase: base?.portfolio.balances.taxDeferred ?? 0,
                rothBase: base?.portfolio.balances.roth ?? 0,
                totalWith: p.portfolio.balances.total,
                totalWithout: base?.portfolio.balances.total ?? 0,
            };
        });
    }, [withC.projections, noC.projections]);

    const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }> }) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="bg-white border-2 border-gray-300 rounded-lg p-3 shadow-lg">
                <p className="font-semibold mb-2">Age {payload[0] && (payload as Array<{ payload?: { age: number } }>)[0]?.payload?.age}</p>
                {payload.map((entry) => (
                    <p key={entry.name} style={{ color: entry.color }} className="text-sm">
                        {entry.name}: {formatMoney(entry.value)}
                    </p>
                ))}
            </div>
        );
    };

    return (
        <div className="bg-white rounded-xl border-2 border-emerald-200 p-6 space-y-5">
            <div className="flex items-start gap-3">
                <div className="inline-flex p-3 rounded-lg bg-emerald-50 text-emerald-700">
                    <Repeat className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">Roth Conversion Impact</h3>
                    <p className="text-sm text-gray-600">
                        Expected-return path (no market volatility) with your conversion plan vs the same plan with conversions off.
                        Converted {formatMoney(withC.totalConverted)} and paid {formatMoney(withC.conversionTax)} of conversion tax.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 bg-gray-50">
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Ending portfolio at {endAge}</p>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Without</span>
                        <span className="font-medium text-gray-900">{formatMoney(noC.endingBalance)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>With conversions</span>
                        <span className="font-medium text-gray-900">{formatMoney(withC.endingBalance)}</span>
                    </div>
                    <Delta value={impact.endingBalanceDelta} />
                </div>

                <div className="border rounded-lg p-4 bg-gray-50">
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Lifetime taxes</p>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Without</span>
                        <span className="font-medium text-gray-900">{formatMoney(noC.lifetimeTax)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>With conversions</span>
                        <span className="font-medium text-gray-900">{formatMoney(withC.lifetimeTax)}</span>
                    </div>
                    <Delta value={impact.lifetimeTaxDelta} invert />
                    <div className="mt-3 pt-3 border-t text-xs text-gray-600 space-y-1">
                        <div className="flex justify-between">
                            <span>Pre-RMD (before {RMD_START_AGE})</span>
                            <span>{formatMoney(withC.preRmdTax)} vs {formatMoney(noC.preRmdTax)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Post-RMD ({RMD_START_AGE}+)</span>
                            <span>{formatMoney(withC.postRmdTax)} vs {formatMoney(noC.postRmdTax)}</span>
                        </div>
                    </div>
                </div>

                <div className="border rounded-lg p-4 bg-gray-50">
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">RMD totals from age {RMD_START_AGE}</p>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Without</span>
                        <span className="font-medium text-gray-900">{formatMoney(noC.totalRmd)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>With conversions</span>
                        <span className="font-medium text-gray-900">{formatMoney(withC.totalRmd)}</span>
                    </div>
                    <Delta value={impact.rmdDelta} invert />
                    <p className="text-xs text-gray-500 mt-2">
                        Smaller future RMDs are the usual reason to convert in the gap years.
                    </p>
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">Account mix over time</h4>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                            type="checkbox"
                            checked={overlay}
                            onChange={(e) => setOverlay(e.target.checked)}
                        />
                        Overlay without-conversion path
                    </label>
                </div>

                <ResponsiveContainer width="100%" height={360}>
                    {overlay ? (
                        <ComposedChart data={compositionData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="age" tick={{ fontSize: 12 }} label={{ value: 'Age', position: 'insideBottom', offset: -5 }} />
                            <YAxis tickFormatter={formatMoney} tick={{ fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <ReferenceLine x={RMD_START_AGE} stroke="#9ca3af" strokeDasharray="4 4" label={{ value: 'RMDs', fill: '#6b7280', fontSize: 11 }} />
                            <Line type="monotone" dataKey="traditional" name="Traditional (with)" stroke="#d97706" strokeWidth={2.5} dot={false} />
                            <Line type="monotone" dataKey="traditionalBase" name="Traditional (without)" stroke="#d97706" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                            <Line type="monotone" dataKey="roth" name="Roth (with)" stroke="#059669" strokeWidth={2.5} dot={false} />
                            <Line type="monotone" dataKey="rothBase" name="Roth (without)" stroke="#059669" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                        </ComposedChart>
                    ) : (
                        <AreaChart data={compositionData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="age" tick={{ fontSize: 12 }} label={{ value: 'Age', position: 'insideBottom', offset: -5 }} />
                            <YAxis tickFormatter={formatMoney} tick={{ fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <ReferenceLine x={RMD_START_AGE} stroke="#9ca3af" strokeDasharray="4 4" label={{ value: 'RMDs', fill: '#6b7280', fontSize: 11 }} />
                            <Area type="monotone" dataKey="traditional" name="Traditional" stackId="1" stroke="#d97706" fill="#fde68a" />
                            <Area type="monotone" dataKey="roth" name="Roth" stackId="1" stroke="#059669" fill="#6ee7b7" />
                            <Area type="monotone" dataKey="taxable" name="Taxable" stackId="1" stroke="#2563eb" fill="#93c5fd" />
                            <Area type="monotone" dataKey="hsa" name="HSA" stackId="1" stroke="#7c3aed" fill="#c4b5fd" />
                        </AreaChart>
                    )}
                </ResponsiveContainer>
                <p className="text-xs text-gray-500 mt-2">
                    During the conversion window, Traditional should shrink faster and Roth should grow tax-free.
                    Solid lines are with conversions; dashed lines are the same assumptions without them.
                </p>
            </div>
        </div>
    );
}
