// src/components/wizard/Screen2SavingsIncome.tsx
// Screen 2 of 4 — "Savings & Income": account balances at retirement + income sources.
// Merges the former Investment Accounts and Income Sources steps. Basic mode shows the
// core fields (balances/returns, Social Security, HSA); Advanced reveals cost basis, the
// HSA non-medical policy, and Pensions (rare for the FIRE audience). Optional income
// sources (Pension, Part-Time, Rental) use a compact "+ Add" pattern to save vertical space.

import { useInputs } from '@/contexts/InputsContext';
import { DEFAULT_VALUES, DEFAULT_SPOUSE_SOCIAL_SECURITY } from '@/lib/constants';
import { Trash2, AlertCircle } from 'lucide-react';
import type { Pension } from '@/types';
import { CollapsibleHelpPanel } from '@/components/common/CollapsibleHelpPanel';
import { CurrencyField } from '@/components/common/CurrencyField';
import { PercentField } from '@/components/common/PercentField';
import { NumberField } from '@/components/common/NumberField';
import { HelpPopover } from '@/components/common/HelpPopover';
import { InlineGuidance } from '@/components/common/InlineGuidance';
import { ScopeBadge } from '@/components/common/ScopeBadge';

export function Screen2SavingsIncome() {
    const {
        inputs,
        updateAccount,
        updateHSA,
        updateSocialSecurity,
        updateSpouseSocialSecurity,
        addPension,
        removePension,
        updatePension,
        updatePartTimeWork,
        updateRentalIncome,
    } = useInputs();
    const { accounts, income, personal, mode } = inputs;
    const isAdvanced = mode === 'advanced';
    const isMFJ = personal.filingStatus === 'married_joint';

    // HSA example figures, derived from the default tax rate so they never drift.
    const defaultTaxRate = DEFAULT_VALUES.tax.combinedEffectiveRate;
    const afterTaxDollar = (1 - defaultTaxRate).toFixed(2);
    const taxRatePct = (defaultTaxRate * 100).toFixed(0);
    const hsaEfficiencyPct = (defaultTaxRate / (1 - defaultTaxRate) * 100).toFixed(0);
    const defaultCostBasisPct = ((DEFAULT_VALUES.accounts.taxable.costBasisPercentage ?? 0.7) * 100).toFixed(0);

    const spouseSS = income.spouseSocialSecurity ?? DEFAULT_SPOUSE_SOCIAL_SECURITY;

    const claimingFactors: Record<number, number> = {
        62: 0.70, 63: 0.75, 64: 0.80, 65: 0.867, 66: 0.933, 67: 1.0, 68: 1.08, 69: 1.16, 70: 1.24,
    };
    const estimatedMonthlyBenefit =
        income.socialSecurity.monthlyBenefitAtFRA * (claimingFactors[income.socialSecurity.claimingAge] || 1.0);
    const taxPct = income.socialSecurity.taxablePercentage * 100;
    const hasEarningsTestIssue =
        income.socialSecurity.claimingAge < 67 && income.partTimeWork.enabled && income.partTimeWork.startAge < 67;

    const handlePensionChange = (id: string, field: keyof Pension, value: any) => updatePension(id, { [field]: value });

    const accountTypes = [
        { key: 'taxDeferred' as const, label: 'Tax-Deferred', subtitle: 'Traditional 401(k), 403(b), IRA', color: 'from-blue-50 to-white',
          help: <><p className="mb-2">Withdrawals taxed as ordinary income; RMDs at 75 (SECURE 2.0, born 1960+); 10% penalty before 59½.</p></> },
        { key: 'roth' as const, label: 'Roth', subtitle: 'Roth 401(k), Roth IRA', color: 'from-green-50 to-white',
          help: <><p className="mb-2">After-tax contributions; qualified withdrawals tax-free; no lifetime RMDs.</p></> },
        { key: 'taxable' as const, label: 'Taxable Brokerage', subtitle: 'Regular investment accounts', color: 'from-purple-50 to-white',
          help: <><p className="mb-2">Only the gain portion is taxed on withdrawal; no contribution limits or age penalties.</p></> },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold mb-2">Savings &amp; Income</h2>
                <p className="text-gray-600">What you’ll have saved at retirement, and the income you’ll receive</p>
            </div>

            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-1">💡 Enter “at retirement” balances</h3>
                <p className="text-sm text-blue-800">
                    Enter what you expect to have saved <strong>by retirement age</strong>, not today’s balances.
                </p>
            </div>

            {/* ---- Accounts ---- */}
            <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                    Investment Accounts
                    {isMFJ && <ScopeBadge scope="household" />}
                </h3>
                <p className="text-sm text-gray-500">Expected-return guide: stocks ~8%, bonds ~4% — blend for your mix.</p>
                {isMFJ && (
                    <p className="text-sm text-gray-600 mt-1">
                        Combine both spouses’ balances into one figure per account type — the simulator
                        pools them and draws from the household total.
                    </p>
                )}
            </div>
            {accountTypes.map(({ key, label, subtitle, color, help }) => (
                <div key={key} className={`border rounded-lg p-5 bg-gradient-to-r ${color}`}>
                    <div className="mb-3">
                        <h4 className="font-semibold text-lg flex items-center gap-2">
                            {label}
                            <HelpPopover title={label}>{help}</HelpPopover>
                        </h4>
                        <p className="text-sm text-gray-600">{subtitle}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CurrencyField
                            label="Balance at Retirement"
                            value={accounts[key].balanceAtRetirement}
                            onChange={(balanceAtRetirement) => updateAccount(key, { balanceAtRetirement })}
                            step={1000}
                        />
                        <PercentField
                            label="Expected Annual Return"
                            value={accounts[key].expectedReturnRate}
                            onChange={(expectedReturnRate) => updateAccount(key, { expectedReturnRate })}
                            step={0.1}
                            min={-5}
                            max={20}
                        />
                        {key === 'taxable' && isAdvanced && (
                            <PercentField
                                label="Cost Basis Percentage"
                                value={accounts[key].costBasisPercentage || 0.7}
                                onChange={(costBasisPercentage) => updateAccount(key, { costBasisPercentage: costBasisPercentage || 0.7 })}
                                step={5}
                                min={0}
                                max={100}
                                decimals={0}
                                className="md:col-span-2"
                                inputWrapperClassName="max-w-xs"
                                helperText={`Portion that is original investment (not gains). Default ${defaultCostBasisPct}%`}
                            />
                        )}
                    </div>
                </div>
            ))}

            {/* HSA — stays in Basic; help panel collapsed by default */}
            <div className="border rounded-lg p-5 bg-gradient-to-r from-teal-50 to-white">
                <div className="mb-3">
                    <h4 className="font-semibold text-lg flex items-center gap-2">
                        Health Savings Account (HSA)
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">Triple tax-advantaged</span>
                    </h4>
                    <p className="text-sm text-gray-600">Used tax-free for healthcare</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CurrencyField
                        label="Balance at Retirement"
                        value={accounts.hsa.balanceAtRetirement}
                        onChange={(balanceAtRetirement) => updateHSA({ balanceAtRetirement })}
                        step={1000}
                        inputClassName="focus:ring-teal-500"
                    />
                    <PercentField
                        label="Expected Annual Return"
                        value={accounts.hsa.expectedReturnRate}
                        onChange={(expectedReturnRate) => updateHSA({ expectedReturnRate })}
                        step={0.1}
                        min={-5}
                        max={20}
                        inputClassName="focus:ring-teal-500"
                        helperText="Conservative growth (5-7%)"
                    />
                    {isAdvanced && (
                        <div className="md:col-span-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={accounts.hsa.allowNonMedicalAfter65}
                                    onChange={(e) => updateHSA({ allowNonMedicalAfter65: e.target.checked })}
                                    className="w-4 h-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded" />
                                <span className="text-sm font-medium">Allow general withdrawals after age 65 (taxed as ordinary income)</span>
                            </label>
                            <p className="text-xs text-gray-500 mt-1 ml-6">
                                Unchecked (default) = HSA used only for healthcare, the most tax-efficient use.
                            </p>
                        </div>
                    )}
                </div>
                <div className="mt-4">
                    <CollapsibleHelpPanel title="How HSA Works in This Simulator" variant="info" defaultOpen={false}>
                        <div className="text-sm space-y-2">
                            <p><strong>Tax-free healthcare:</strong> the HSA automatically pays healthcare (premiums + out-of-pocket) tax-free, protecting your other accounts.</p>
                            <p>💡 A $1 tax-deferred withdrawal is worth about ${afterTaxDollar} after income tax (at {taxRatePct}%), so the HSA stretches roughly {hsaEfficiencyPct}% further for healthcare.</p>
                        </div>
                    </CollapsibleHelpPanel>
                </div>
            </div>

            {/* Total portfolio summary — neutral (a sum, not a "good"/"bad" signal) */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-800">Total Starting Portfolio</p>
                        <p className="text-xs text-slate-500">Combined balance at retirement (all accounts)</p>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">
                        ${((accounts.taxDeferred.balanceAtRetirement + accounts.roth.balanceAtRetirement +
                            accounts.taxable.balanceAtRetirement + accounts.hsa.balanceAtRetirement) / 1000).toFixed(0)}K
                    </p>
                </div>
            </div>

            {/* ---- Income ---- */}
            <div className="border-t pt-6">
                <h3 className="text-xl font-bold mb-4">Income Sources</h3>

                {/* Social Security */}
                <div className="border rounded-lg p-5 bg-gradient-to-r from-blue-50 to-white">
                    <div className="mb-3">
                        <h4 className="font-semibold text-lg flex items-center gap-2">
                            Social Security
                            <HelpPopover title="Getting Your Benefit Estimate">
                                <p className="mb-2">Based on your highest 35 years of earnings. Get your figure at ssa.gov/myaccount → your FRA benefit.</p>
                            </HelpPopover>
                        </h4>
                        <p className="text-sm text-gray-600">Most Americans’ primary retirement income</p>
                    </div>

                    <CollapsibleHelpPanel title="Understanding Social Security Claiming Strategies" variant="info" className="mb-4" defaultOpen={false}>
                        <div className="space-y-2 text-sm">
                            <p>Each year you delay (up to 70) raises your benefit ~8%. Claiming at 62 pays 70% of FRA; 70 pays 124%. Break-even is usually age 78–80.</p>
                        </div>
                    </CollapsibleHelpPanel>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CurrencyField
                            label="Monthly Benefit at FRA"
                            help={<HelpPopover><p>Baseline amount before early/delayed claiming adjustments (FRA is 67 for those born 1960+).</p></HelpPopover>}
                            value={income.socialSecurity.monthlyBenefitAtFRA}
                            onChange={(monthlyBenefitAtFRA) => updateSocialSecurity({ monthlyBenefitAtFRA })}
                            step={50}
                            helperText="From ssa.gov/myaccount"
                        />
                        <PercentField
                            label="Annual COLA Rate"
                            help={<HelpPopover><p>Cost-of-living adjustment. 10-year average ≈ 3.0%.</p></HelpPopover>}
                            value={income.socialSecurity.colaRate}
                            onChange={(colaRate) => updateSocialSecurity({ colaRate })}
                            step={0.1}
                            min={0}
                            max={10}
                            helperText={`Default ${(DEFAULT_VALUES.income.socialSecurity.colaRate * 100).toFixed(1)}%`}
                        />
                        <div>
                            <NumberField
                                label="Claiming Age"
                                value={income.socialSecurity.claimingAge}
                                onChange={(claimingAge) => updateSocialSecurity({ claimingAge: claimingAge || 67 })}
                                min={62}
                                max={70}
                            />
                            <InlineGuidance variant="example" className="mt-2">
                                <strong>At age {income.socialSecurity.claimingAge}:</strong> ${estimatedMonthlyBenefit.toFixed(0)}/mo (${(estimatedMonthlyBenefit * 12).toLocaleString()}/yr)
                            </InlineGuidance>
                        </div>
                        <PercentField
                            label="SS Taxable Percentage"
                            help={
                                <HelpPopover title="How Much of SS is Taxable?">
                                    <p>A <strong>cap</strong>, not a fixed rate. The tool applies the IRS provisional-income formula each year and taxes less (down to 0%) when income is low. 85% is the statutory max.</p>
                                </HelpPopover>
                            }
                            value={income.socialSecurity.taxablePercentage}
                            onChange={(taxablePercentage) => updateSocialSecurity({ taxablePercentage })}
                            step={5}
                            min={0}
                            max={85}
                            decimals={0}
                            helperText={taxPct >= 85 ? 'Cap at the 85% max — actual share computed each year' : `Caps taxable SS at ${taxPct}%`}
                        />
                    </div>

                    {hasEarningsTestIssue && (
                        <div className="mt-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-yellow-800">
                                <p className="font-semibold text-yellow-900 mb-1">⚠️ Earnings test applies</p>
                                <p>Claiming before FRA (67) while working can temporarily reduce benefits ($1 withheld per $2 earned above $23,400/yr in 2025). The simulator applies this.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Spouse SS (MFJ) */}
                {isMFJ && (
                    <div className="border rounded-lg p-5 bg-gradient-to-r from-blue-50 to-white mt-4">
                        <div className="mb-3">
                            <h4 className="font-semibold text-lg">Spouse’s Social Security</h4>
                            <p className="text-sm text-gray-600">Added to yours before the IRS taxability formula. COLA and taxable-% above are shared.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CurrencyField
                                label="Monthly Benefit at FRA"
                                value={spouseSS.monthlyBenefitAtFRA}
                                onChange={(monthlyBenefitAtFRA) => updateSpouseSocialSecurity({ monthlyBenefitAtFRA })}
                                step={50}
                            />
                            <NumberField
                                label="Claiming Age"
                                value={spouseSS.claimingAge}
                                onChange={(claimingAge) => updateSpouseSocialSecurity({ claimingAge: claimingAge || 67 })}
                                min={62}
                                max={70}
                            />
                        </div>
                    </div>
                )}

                {/* Optional income sources — compact "+ Add" pattern */}
                <div className="mt-4 space-y-3">
                    {/* Pensions (Advanced only) */}
                    {isAdvanced ? (
                        <div className="border rounded-lg p-4 bg-gradient-to-r from-green-50 to-white">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-semibold text-lg flex items-center gap-2">
                                    Pensions
                                    {isMFJ && <ScopeBadge scope="household" />}
                                    <HelpPopover title="Pensions"><p>Defined-benefit income for life. Private: usually 0% COLA; government: often 2–3%.</p></HelpPopover>
                                </h4>
                                <button
                                    onClick={() => addPension({ id: Date.now().toString(), name: 'New Pension', monthlyAmount: 1000, startAge: personal.retirementAge, colaRate: 0 })}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap">
                                    + Add
                                </button>
                            </div>
                            {isMFJ && (
                                <InlineGuidance className="mb-3">
                                    Add a spouse’s pension as its own entry. Start ages run on <strong>your</strong>{' '}
                                    timeline, so use your age in the year their pension begins.
                                </InlineGuidance>
                            )}
                            {income.pensions.length > 0 ? (
                                <div className="space-y-3">
                                    {income.pensions.map((pension) => (
                                        <div key={pension.id} className="bg-white p-4 rounded-md border">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-medium mb-1">Name</label>
                                                    <input type="text" value={pension.name}
                                                        onChange={(e) => handlePensionChange(pension.id, 'name', e.target.value)}
                                                        placeholder="e.g., State Pension" className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" maxLength={50} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium mb-1">Monthly</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-2 text-gray-500 text-sm">$</span>
                                                        <input type="number" value={pension.monthlyAmount}
                                                            onChange={(e) => handlePensionChange(pension.id, 'monthlyAmount', parseFloat(e.target.value) || 0)}
                                                            className="w-full pl-7 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" step="50" min="0" />
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <label className="block text-xs font-medium mb-1">Start Age</label>
                                                        <input type="number" value={pension.startAge}
                                                            onChange={(e) => handlePensionChange(pension.id, 'startAge', parseInt(e.target.value) || personal.retirementAge)}
                                                            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" min={personal.retirementAge} max={personal.lifeExpectancy} />
                                                    </div>
                                                    <div className="w-24">
                                                        <label className="block text-xs font-medium mb-1">COLA</label>
                                                        <div className="relative">
                                                            <input type="number" value={(pension.colaRate * 100).toFixed(1)}
                                                                onChange={(e) => handlePensionChange(pension.id, 'colaRate', parseFloat(e.target.value) / 100 || 0)}
                                                                className="w-full pr-6 pl-2 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" step="0.1" min="0" max="10" />
                                                            <span className="absolute right-2 top-2 text-gray-500 text-sm">%</span>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => removePension(pension.id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-md self-end" title="Remove pension">
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                            {personal.state === 'NY' && (
                                                <label className="flex items-center gap-2 mt-3 text-sm text-gray-700">
                                                    <input type="checkbox" checked={pension.isGovernment ?? false}
                                                        onChange={(e) => handlePensionChange(pension.id, 'isGovernment', e.target.checked)}
                                                        className="rounded border-gray-300 focus:ring-2 focus:ring-blue-500" />
                                                    Government pension (NYS, local, federal, or military — fully exempt from New York tax)
                                                </label>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-500 italic">
                            Have a pension? Switch to <strong>Advanced</strong> (top right) to add it — most early retirees don’t have one.
                        </p>
                    )}

                    {/* Part-Time Work — + Add pattern */}
                    {income.partTimeWork.enabled ? (
                        <div className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-white">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-semibold text-lg flex items-center gap-2">
                                    Part-Time Work
                                    {isMFJ && <ScopeBadge scope="you-only" />}
                                    <HelpPopover title="Part-Time Work"><p>Subject to 7.65% payroll tax and income tax; may trigger the SS earnings test if claiming before 67.</p></HelpPopover>
                                </h4>
                                <button onClick={() => updatePartTimeWork({ enabled: false })}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-md" title="Remove part-time work"><Trash2 className="w-5 h-5" /></button>
                            </div>
                            {isMFJ && (
                                <InlineGuidance className="mb-3">
                                    Enter <strong>your</strong> earnings only. This figure drives your Social Security
                                    earnings test, so adding a spouse’s income here would overstate the reduction to
                                    your benefit. A spouse’s own part-time work isn’t modeled — see Disclosures.
                                </InlineGuidance>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <CurrencyField
                                    label="Annual Gross Income"
                                    value={income.partTimeWork.annualIncome}
                                    onChange={(annualIncome) => updatePartTimeWork({ annualIncome })}
                                    step={1000}
                                />
                                <NumberField
                                    label="Start Age"
                                    value={income.partTimeWork.startAge}
                                    onChange={(startAge) => updatePartTimeWork({ startAge })}
                                />
                                <NumberField
                                    label="End Age"
                                    value={income.partTimeWork.endAge}
                                    onChange={(endAge) => updatePartTimeWork({ endAge })}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border rounded-lg p-4 bg-gray-50">
                            <div>
                                <span className="font-medium">Part-Time Work</span>
                                <span className="text-sm text-gray-500 ml-2">Optional income from working in retirement</span>
                            </div>
                            <button onClick={() => updatePartTimeWork({ enabled: true })}
                                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap">+ Add</button>
                        </div>
                    )}

                    {/* Rental Income — + Add pattern */}
                    {income.rentalIncome.enabled ? (
                        <div className="border rounded-lg p-4 bg-gradient-to-r from-orange-50 to-white">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-semibold text-lg flex items-center gap-2">
                                    Rental Income
                                    {isMFJ && <ScopeBadge scope="household" />}
                                    <HelpPopover title="Rental Income"><p>Enter NET income after mortgage, taxes, insurance, maintenance, management, and vacancy.</p></HelpPopover>
                                </h4>
                                <button onClick={() => updateRentalIncome({ enabled: false })}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-md" title="Remove rental income"><Trash2 className="w-5 h-5" /></button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <CurrencyField
                                    label="Annual Net Income"
                                    value={income.rentalIncome.annualNetIncome}
                                    onChange={(annualNetIncome) => updateRentalIncome({ annualNetIncome })}
                                    step={1000}
                                />
                                <NumberField
                                    label="Start Age"
                                    value={income.rentalIncome.startAge}
                                    onChange={(startAge) => updateRentalIncome({ startAge })}
                                />
                                <div>
                                    <label className="block text-sm font-medium mb-1">End Age</label>
                                    <input type="number" value={income.rentalIncome.endAge ?? ''}
                                        disabled={income.rentalIncome.endAge === null} placeholder="e.g. 85"
                                        onChange={(e) => updateRentalIncome({ endAge: parseInt(e.target.value) || null })}
                                        className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${income.rentalIncome.endAge === null ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`} />
                                    <label className="flex items-center mt-1.5 text-xs text-gray-500">
                                        <input type="checkbox" checked={income.rentalIncome.endAge === null}
                                            onChange={(e) => updateRentalIncome({ endAge: e.target.checked ? null : 85 })}
                                            className="w-3 h-3 text-blue-600 rounded mr-1.5" />
                                        No end date (ongoing)
                                    </label>
                                </div>
                            </div>
                            <label className="flex items-center mt-3 text-sm">
                                <input type="checkbox" checked={income.rentalIncome.inflationAdjusted}
                                    onChange={(e) => updateRentalIncome({ inflationAdjusted: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded mr-2" />
                                Adjust for inflation
                            </label>
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border rounded-lg p-4 bg-gray-50">
                            <div>
                                <span className="font-medium">Rental Income</span>
                                <span className="text-sm text-gray-500 ml-2">Optional net income from rental properties</span>
                            </div>
                            <button onClick={() => updateRentalIncome({ enabled: true })}
                                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap">+ Add</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
