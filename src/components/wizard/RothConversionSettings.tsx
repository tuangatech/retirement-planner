// src/components/wizard/RothConversionSettings.tsx
// Configuration panel for the Roth conversion plan. Updates InputsContext immediately;
// the Monte Carlo run itself still happens when the user calculates.

import { useInputs } from '@/contexts/InputsContext';
import { DEFAULT_ROTH_CONVERSION } from '@/lib/constants';
import { ROTH_CONVERSION_BRACKET_OPTIONS } from '@/lib/calculations/rothConversion';
import { NumberField } from '@/components/common/NumberField';
import { CurrencyField } from '@/components/common/CurrencyField';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const BRACKET_LABELS: Record<number, string> = {
    0.10: '10% Bracket',
    0.12: '12% Bracket',
    0.22: '22% Bracket',
    0.24: '24% Bracket',
    0.32: '32% Bracket',
};

export function RothConversionSettings() {
    const { inputs, updateRothConversion, updateWithdrawalStrategy } = useInputs();
    const plan = inputs.rothConversion ?? DEFAULT_ROTH_CONVERSION;
    const ageError = plan.startAge >= plan.endAge;

    const setEnabled = (enabled: boolean) => {
        updateRothConversion({ enabled });
        if (enabled) {
            updateWithdrawalStrategy({ strategy: 'roth_conversion' });
        } else if (inputs.withdrawalStrategy.strategy === 'roth_conversion') {
            updateWithdrawalStrategy({ strategy: 'tax_smart' });
        }
    };

    const setStartAge = (startAge: number) => {
        updateRothConversion({
            startAge,
            endAge: startAge >= plan.endAge ? startAge + 1 : plan.endAge,
        });
    };

    const setEndAge = (endAge: number) => {
        updateRothConversion({
            endAge,
            startAge: endAge <= plan.startAge ? Math.max(inputs.personal.retirementAge, endAge - 1) : plan.startAge,
        });
    };

    return (
        <div className={cn(
            'border rounded-lg p-5',
            plan.enabled ? 'bg-gradient-to-r from-green-50 to-white border-green-200' : 'bg-gray-50'
        )}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div>
                    <h3 className="font-semibold text-lg">Roth Conversion Plan</h3>
                    <p className="text-sm text-gray-600">
                        Convert extra tax-deferred money to Roth during low-income years. Tax-smart
                        sequencing still fills the deduction floor first; this converts beyond spending.
                    </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer shrink-0">
                    <span className="text-sm font-medium text-gray-700">{plan.enabled ? 'On' : 'Off'}</span>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={plan.enabled}
                        onClick={() => setEnabled(!plan.enabled)}
                        className={cn(
                            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                            plan.enabled ? 'bg-green-600' : 'bg-gray-300'
                        )}
                    >
                        <span
                            className={cn(
                                'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                                plan.enabled ? 'translate-x-5' : 'translate-x-1'
                            )}
                        />
                    </button>
                </label>
            </div>

            <fieldset disabled={!plan.enabled} className={cn(!plan.enabled && 'opacity-60')}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <NumberField
                        label="Start Age"
                        value={plan.startAge}
                        onChange={setStartAge}
                        min={inputs.personal.retirementAge}
                        max={inputs.personal.lifeExpectancy - 1}
                        helperText="First year to convert (inclusive)"
                    />
                    <NumberField
                        label="End Age"
                        value={plan.endAge}
                        onChange={setEndAge}
                        min={inputs.personal.retirementAge + 1}
                        max={inputs.personal.lifeExpectancy}
                        helperText="Last year to convert (inclusive)"
                    />
                </div>
                {ageError && (
                    <p className="text-sm text-red-700 mt-2">Start age must be earlier than end age.</p>
                )}

                <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Conversion method</p>
                    <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => updateRothConversion({ strategyType: 'fixed_amount' })}
                            className={cn(
                                'px-3 py-2 text-sm font-medium',
                                plan.strategyType === 'fixed_amount'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                            )}
                        >
                            Fixed Annual Amount
                        </button>
                        <button
                            type="button"
                            onClick={() => updateRothConversion({ strategyType: 'bracket_fill' })}
                            className={cn(
                                'px-3 py-2 text-sm font-medium border-l border-gray-300',
                                plan.strategyType === 'bracket_fill'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                            )}
                        >
                            Fill Tax Bracket
                        </button>
                    </div>
                </div>

                {plan.strategyType === 'fixed_amount' ? (
                    <CurrencyField
                        className="mt-4 max-w-sm"
                        label="Annual Conversion"
                        value={plan.fixedAmount ?? 0}
                        onChange={(fixedAmount) => updateRothConversion({ fixedAmount })}
                        step={1000}
                        helperText="Converted each year in the window, capped by the traditional balance"
                    />
                ) : (
                    <div className="mt-4 max-w-sm">
                        <label htmlFor="roth-target-bracket" className="block text-sm font-medium mb-1">
                            Target tax bracket
                        </label>
                        <select
                            id="roth-target-bracket"
                            value={plan.targetTaxBracket ?? 0.12}
                            onChange={(e) => updateRothConversion({ targetTaxBracket: parseFloat(e.target.value) })}
                            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            {ROTH_CONVERSION_BRACKET_OPTIONS.map((rate) => (
                                <option key={rate} value={rate}>
                                    {BRACKET_LABELS[rate] ?? `${(rate * 100).toFixed(0)}% Bracket`}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Convert enough to fill this 2026 ordinary-income bracket (after the standard deduction).
                        </p>
                    </div>
                )}

                <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Pay conversion tax from</p>
                    <div className="space-y-2">
                        <label className="flex items-start gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="roth-tax-source"
                                className="mt-1"
                                checked={plan.payTaxFromAccount === 'taxable_cash'}
                                onChange={() => updateRothConversion({ payTaxFromAccount: 'taxable_cash' })}
                            />
                            <span className="text-sm text-gray-700">
                                <strong>Taxable cash / brokerage</strong> — keeps the full conversion in Roth.
                            </span>
                        </label>
                        <label className="flex items-start gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="roth-tax-source"
                                className="mt-1"
                                checked={plan.payTaxFromAccount === 'conversion_proceeds'}
                                onChange={() => updateRothConversion({ payTaxFromAccount: 'conversion_proceeds' })}
                            />
                            <span className="text-sm text-gray-700">
                                <strong>Withhold from conversion</strong> — smaller Roth deposit; use if cash is tight.
                            </span>
                        </label>
                    </div>
                </div>
            </fieldset>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-4 flex gap-2">
                <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                    The engine uses your single marginal rate (not full 10–37% brackets) to price the
                    conversion tax. Bracket-fill only uses the published 2026 bracket <em>caps</em> as
                    a ceiling. Watch ACA subsidies (pre-65) and IRMAA (2-year lookback) with a CPA —
                    those are not modeled.
                </p>
            </div>
        </div>
    );
}
