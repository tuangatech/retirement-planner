// src/pages/StateTaxComparisonPage.tsx
// Standalone one-year tax comparison: enter a household's income situation once and see
// federal + every modeled state's tax side by side. Independent of the wizard/Monte Carlo
// flow — no account balances, no withdrawal strategy, no saved scenario. See
// docs/scenario-tax-comparisons.md for worked examples and src/lib/calculations/compareStatesTax.ts
// for the calculation itself.

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { CurrencyField } from '@/components/common/CurrencyField';
import { compareStatesTax, type StateTaxComparisonInput } from '@/lib/calculations/compareStatesTax';
import type { FilingStatus } from '@/lib/calculations/taxes';
import { US_STATES } from '@/lib/constants';

/** Fixed for v1 — several state schedules (e.g. New York's standard deduction) only have one
 *  year of committed data, so a year picker would silently be wrong for most choices. */
const TAX_YEAR = 2026;

const STATE_LABELS: Record<string, string> = Object.fromEntries(US_STATES.map((s) => [s.value, s.label]));

function money(amount: number): string {
    return `$${Math.round(amount).toLocaleString()}`;
}

function TaxFreeBadge() {
    return (
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-800">
            Tax-free
        </span>
    );
}

// Defaults mirror Situation 1 in docs/scenario-tax-comparisons.md — a real, already-verified
// situation rather than an arbitrary or all-zero starting point.
export default function StateTaxComparisonPage() {
    const [filingStatus, setFilingStatus] = useState<FilingStatus>('married_joint');
    const [age, setAge] = useState(58);
    const [spouseAge, setSpouseAge] = useState(56);

    const [socialSecurity, setSocialSecurity] = useState(0);
    const [governmentPensionIncome, setGovernmentPensionIncome] = useState(0);
    const [privatePensionIncome, setPrivatePensionIncome] = useState(0);
    const [taxDeferredWithdrawal, setTaxDeferredWithdrawal] = useState(25000);  // 401(k) + Traditional IRA
    const [investmentGains, setInvestmentGains] = useState(6000); // LTCG + Dividends
    const [nonTaxableCashWithdrawn, setNonTaxableCashWithdrawn] = useState(13000); // brokerage cost basis
    const [rothDistribution, setRothDistribution] = useState(0); // Roth IRA + Roth 401(k)
    const [hsaAmount, setHsaAmount] = useState(26000); // HSA withdrawal
    const [hsaQualifiedMedical, setHsaQualifiedMedical] = useState(true);
    const [partTimeWork, setPartTimeWork] = useState(8000);
    const [rentalIncome, setRentalIncome] = useState(0);

    const [expandedFederal, setExpandedFederal] = useState(false);
    const [expandedState, setExpandedState] = useState<string | null>(null);

    const isMFJ = filingStatus === 'married_joint';
    const hsaNonMedicalWithdrawal = hsaQualifiedMedical ? 0 : hsaAmount;

    const input: StateTaxComparisonInput = useMemo(
        () => ({
            filingStatus,
            age,
            spouseAge: isMFJ ? spouseAge : undefined,
            year: TAX_YEAR,
            socialSecurity,
            governmentPensionIncome,
            privatePensionIncome,
            taxDeferredWithdrawal,
            investmentGains,
            partTimeWork,
            rentalIncome,
            hsaNonMedicalWithdrawal,
        }),
        [
            filingStatus, age, isMFJ, spouseAge, socialSecurity, governmentPensionIncome,
            privatePensionIncome, taxDeferredWithdrawal, investmentGains, partTimeWork,
            rentalIncome, hsaNonMedicalWithdrawal,
        ]
    );

    const result = useMemo(() => compareStatesTax(input), [input]);

    const sortedStates = useMemo(
        () => [...result.states].sort((a, b) => a.detail.tax - b.detail.tax || a.state.localeCompare(b.state)),
        [result]
    );

    const grossIncome =
        socialSecurity + governmentPensionIncome + privatePensionIncome + taxDeferredWithdrawal +
        investmentGains + nonTaxableCashWithdrawn + rothDistribution + hsaAmount +
        partTimeWork + rentalIncome;

    const allZero = result.federal.tax === 0 && result.states.every((s) => s.detail.tax === 0);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header variant="navigation" />

            <div className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full space-y-6">
                <div>
                    <h1 className="text-2xl font-bold mb-2">State Income Tax Comparison</h1>
                    <p className="text-gray-600">
                        Enter one year of retirement income and see federal and state{' '}
                        <strong>income</strong> tax side by side — not property, sales, or estate
                        tax, which this tool doesn&apos;t model. Results update as you type — tax
                        year {TAX_YEAR}.
                    </p>
                </div>

                {/* ---- Household basics ---- */}
                <div className="border rounded-lg p-5 bg-white">
                    <h2 className="font-semibold text-lg mb-3 pb-2 border-b-2 border-blue-200 text-blue-900">Household</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Filing Status</label>
                            <select
                                value={filingStatus}
                                onChange={(e) => setFilingStatus(e.target.value as FilingStatus)}
                                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="single">Single</option>
                                <option value="married_joint">Married Filing Jointly</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Your Age</label>
                            <input
                                type="number"
                                value={age}
                                onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                                min="18"
                                max="100"
                            />
                        </div>
                        {isMFJ && (
                            <div>
                                <label className="block text-sm font-medium mb-1">Spouse&apos;s Age</label>
                                <input
                                    type="number"
                                    value={spouseAge}
                                    onChange={(e) => setSpouseAge(parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                                    min="18"
                                    max="100"
                                />
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        Ages matter here — most state benefits and the federal senior deduction
                        only kick in at 60, 62, or 65.
                    </p>
                </div>

                {/* ---- Income ---- */}
                <div className="border rounded-lg p-5 bg-white space-y-4">
                    <h2 className="font-semibold text-lg pb-2 border-b-2 border-blue-200 text-blue-900">Income for the Year</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CurrencyField label="Social Security (household total)" value={socialSecurity} onChange={setSocialSecurity} step={500} />
                        <CurrencyField label="401(k) / Traditional IRA Withdrawal" value={taxDeferredWithdrawal} onChange={setTaxDeferredWithdrawal} step={500} />
                        <CurrencyField
                            label="Roth IRA / 401(k) Distribution"
                            value={rothDistribution}
                            onChange={setRothDistribution}
                            step={500}
                            helperText="Always $0 taxable — shown only so your total income adds up"
                            help={<TaxFreeBadge />}
                        />
                        <div>
                            <CurrencyField
                                label="HSA Withdrawal"
                                value={hsaAmount}
                                onChange={setHsaAmount}
                                step={500}
                                help={hsaQualifiedMedical ? <TaxFreeBadge /> : undefined}
                            />
                            <label className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                <input
                                    type="checkbox"
                                    checked={hsaQualifiedMedical}
                                    onChange={(e) => setHsaQualifiedMedical(e.target.checked)}
                                    className="rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                                />
                                For qualified medical expenses (always tax-free)
                            </label>
                            {!hsaQualifiedMedical && (
                                <p className="text-xs text-gray-500 mt-1 ml-6">
                                    Taxed as ordinary income everywhere below — only allowed penalty-free after age 65.
                                </p>
                            )}
                        </div>
                        <CurrencyField
                            label="Part-Time Work Income"
                            value={partTimeWork}
                            onChange={setPartTimeWork}
                            step={500}
                            helperText="Wages, self-employment, or consulting income"
                        />
                        <CurrencyField
                            label="Rental Income (net)"
                            value={rentalIncome}
                            onChange={setRentalIncome}
                            step={500}
                            helperText="Net rental income after expenses, royalties, or other passive income"
                        />
                    </div>

                    <div className="border-t pt-4">
                        <h3 className="text-sm font-semibold text-purple-900 mb-3 pb-1 border-b border-purple-200">Brokerage / Savings Withdrawals</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CurrencyField
                                label="Taxable Investment Income"
                                value={investmentGains}
                                onChange={setInvestmentGains}
                                step={500}
                                helperText="Capital gains, dividends, and interest (e.g. from a HYSA or CD) — all taxed the same in this tool"
                            />
                            <CurrencyField
                                label="Other Cash Withdrawn"
                                value={nonTaxableCashWithdrawn}
                                onChange={setNonTaxableCashWithdrawn}
                                step={500}
                                helperText="Money you're simply moving, not earning: brokerage cost basis, or principal from a bank, savings, HYSA, or CD. Doesn't affect your tax bill, but counts toward the total below"
                                help={<TaxFreeBadge />}
                            />
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <h3 className="text-sm font-semibold text-gray-500 mb-3">Pension Income</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CurrencyField
                                label="Government Pension Income"
                                value={governmentPensionIncome}
                                onChange={setGovernmentPensionIncome}
                                step={500}
                                helperText="NYS/local/federal/military pension — fully tax-exempt in NY"
                            />
                            <CurrencyField
                                label="Private Pension / Annuity Income"
                                value={privatePensionIncome}
                                onChange={setPrivatePensionIncome}
                                step={500}
                            />
                        </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-md p-3 flex justify-between items-center">
                        <span className="text-sm text-slate-700">Total gross income entered</span>
                        <span className="font-semibold text-slate-900">{money(grossIncome)}</span>
                    </div>
                </div>

                {/* ---- Assumptions ---- */}
                <div className="border border-amber-200 rounded-lg p-5 bg-amber-50/40">
                    <h2 className="font-semibold text-lg mb-3 text-amber-900">Federal Tax Assumption</h2>
                    <p className="text-xs text-gray-500">
                        Federal tax uses the real 2026 progressive brackets (10%–37%) on taxable
                        income above your standard deduction, currently{' '}
                        <strong>{money(result.federal.standardDeduction)}</strong> for this household
                        (base deduction + age-65+ addition + the OBBBA senior bonus, if either of you
                        is 65+). It does not yet apply the lower 0%/15%/20% long-term capital-gains
                        rates — investment gains above are still taxed as ordinary income, which can
                        overstate federal tax for a household living mostly off capital gains.
                    </p>
                </div>

                {/* ---- Results ---- */}
                <div className="border rounded-lg bg-white overflow-hidden">
                    <div className="p-5 border-b bg-blue-50">
                        <h2 className="font-semibold text-lg text-blue-900">Results</h2>
                        <p className="text-sm text-gray-600">
                            States are sorted from lowest to highest tax owed. Click a row for the breakdown.
                        </p>
                    </div>

                    {allZero && (
                        <div className="m-5 mb-0 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
                            <strong>Every result here is $0</strong> — that&apos;s specific to this
                            household&apos;s age and income, not a sign that state matters less than
                            you&apos;d think. Georgia&apos;s and New York&apos;s retirement-income
                            benefits only start around age 60–65, and cap out at higher incomes. Try
                            a younger age or more investment income to see states diverge.
                        </div>
                    )}

                    {/* Federal — always pinned above the state list */}
                    <div className="border-b bg-blue-50/40">
                        <button
                            onClick={() => setExpandedFederal((v) => !v)}
                            className="w-full flex items-center justify-between px-5 py-3 hover:bg-blue-50 text-left"
                        >
                            <span className="flex items-center gap-2 font-medium text-slate-900">
                                {expandedFederal ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                Federal
                            </span>
                            <span className="font-semibold">{money(result.federal.tax)}</span>
                        </button>
                        {expandedFederal && (
                            <dl className="px-5 pb-4 pl-11 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-700">
                                <dt>Adjusted gross income</dt>
                                <dd className="text-right">{money(result.federal.agi)}</dd>
                                <dt>Taxable Social Security</dt>
                                <dd className="text-right">{money(result.federal.taxableSocialSecurity)}</dd>
                                <dt>Standard deduction (incl. age-65+ &amp; senior bonus)</dt>
                                <dd className="text-right">{money(result.federal.standardDeduction)}</dd>
                                <dt>Taxable income</dt>
                                <dd className="text-right">{money(result.federal.taxableIncome)}</dd>
                            </dl>
                        )}
                    </div>

                    {/* States */}
                    {sortedStates.map(({ state, taxesIncome, detail }) => (
                        <div key={state} className="border-b last:border-b-0">
                            <button
                                onClick={() => setExpandedState((v) => (v === state ? null : state))}
                                className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 text-left"
                            >
                                <span className="flex items-center gap-2 text-slate-900">
                                    {expandedState === state ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    {STATE_LABELS[state] ?? state} <span className="text-gray-400 text-sm">({state})</span>
                                </span>
                                <span className="font-semibold">{money(detail.tax)}</span>
                            </button>
                            {expandedState === state && (
                                <div className="px-5 pb-4 pl-11 text-sm text-gray-700">
                                    {!taxesIncome ? (
                                        <p>{STATE_LABELS[state] ?? state} has no individual income tax.</p>
                                    ) : (
                                        <dl className="grid grid-cols-2 gap-x-6 gap-y-1">
                                            <dt>State adjusted gross income</dt>
                                            <dd className="text-right">{money(detail.agi)}</dd>
                                            <dt>Retirement-income benefit applied</dt>
                                            <dd className="text-right">{money(detail.benefit)}</dd>
                                            <dt>Standard deduction</dt>
                                            <dd className="text-right">{money(detail.standardDeduction)}</dd>
                                            {detail.personalExemption > 0 && (
                                                <>
                                                    <dt>Personal exemption</dt>
                                                    <dd className="text-right">{money(detail.personalExemption)}</dd>
                                                </>
                                            )}
                                            <dt>Taxable income</dt>
                                            <dd className="text-right">{money(detail.taxableIncome)}</dd>
                                            {detail.credit > 0 && (
                                                <>
                                                    <dt>Exemption credit</dt>
                                                    <dd className="text-right">-{money(detail.credit)}</dd>
                                                </>
                                            )}
                                            {detail.surtax > 0 && (
                                                <>
                                                    <dt>Surtax</dt>
                                                    <dd className="text-right">{money(detail.surtax)}</dd>
                                                </>
                                            )}
                                        </dl>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <p className="text-xs text-gray-500">
                    This tool models 13 states — the nine with no individual income tax, plus
                    Georgia, Virginia, California, and New York. Social Security is never taxed at
                    the state level in any state this tool models. See the project&apos;s{' '}
                    <a
                        href="https://github.com/tuangatech/retirement-planner/blob/main/docs/5-state-tax-model.md"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                    >
                        state tax model documentation
                    </a>{' '}
                    for the full methodology and every state&apos;s simplifications.
                </p>
            </div>

            <Footer />
        </div>
    );
}
