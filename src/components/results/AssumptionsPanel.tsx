// src/components/results/AssumptionsPanel.tsx

import { Link } from 'react-router-dom';
import { AlertTriangle, Info } from 'lucide-react';
import type { UserInputs } from '@/types';
import { formatMoney } from '@/lib/format';
import { RMD_START_AGE } from '@/lib/calculations/rmd';
import { stateTaxDisclosure } from '@/lib/calculations/stateTax';

interface AssumptionsPanelProps {
    inputs: UserInputs;
}

export default function AssumptionsPanel({ inputs }: AssumptionsPanelProps) {
    const stateDisclosure = stateTaxDisclosure(inputs.personal.state);
    // A missing mode means a scenario saved before state tax existed — it still recomputes
    // with state folded into the marginal rate, so the disclosure must say so.
    const stateTaxComputed = (inputs.tax.stateTaxMode ?? 'manual') === 'modeled';

    return (
        <div className="space-y-6">
            <div className="border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-900">Understanding Your Results & Limitations</h2>
                <p className="text-gray-600 mt-1">What these projections mean and what they don't include</p>
            </div>
            {/* Critical Understanding Section - NEW */}
            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6">
                <div className="flex items-start gap-3 mb-4">
                    <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                        <h3 className="text-lg font-semibold text-blue-900 mb-2">
                            Understanding Your Results
                        </h3>
                        <p className="text-sm text-blue-800 mb-3">
                            This tool provides probabilistic projections, not guarantees. Here's what the numbers mean:
                        </p>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-blue-800">
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <h4 className="font-semibold text-blue-900 mb-2">📊 Success Rate</h4>
                        <p className="mb-2">
                            The percentage of {inputs.simulation.numberOfRuns.toLocaleString()} simulated scenarios where your portfolio lasted through age {inputs.personal.lifeExpectancy}.
                        </p>
                        <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
                            <li><strong>90-100%:</strong> Strong plan with low risk of running out of money</li>
                            <li><strong>75-89%:</strong> Acceptable but some risk; consider adding safety margin</li>
                            <li><strong>50-74%:</strong> High risk; significant adjustments recommended</li>
                            <li><strong>&lt;50%:</strong> Critical risk; major changes needed to plan</li>
                        </ul>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <h4 className="font-semibold text-blue-900 mb-2">💰 Portfolio Balance Percentiles</h4>
                        <p className="mb-2">
                            These show the distribution of final portfolio balances across <strong>all scenarios</strong> (including failures):
                        </p>
                        <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
                            <li><strong>10th Percentile:</strong> The balance where 90% of scenarios did better (worst 10% outcomes)</li>
                            <li><strong>50th Percentile (Median):</strong> The middle outcome - half did better, half did worse</li>
                            <li><strong>90th Percentile:</strong> The balance where only 10% did better (best 10% outcomes)</li>
                        </ul>
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded">
                            <p className="text-xs text-yellow-900">
                                <strong>⚠️ Important:</strong> With low success rates (&lt;50%), many scenarios end with $0 balance.
                                High percentile values represent rare lucky scenarios with exceptional market returns,
                                not typical outcomes you should plan for.
                            </p>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <h4 className="font-semibold text-blue-900 mb-2">📈 Monte Carlo Simulation</h4>
                        <p className="mb-2">
                            Each simulation uses randomized investment returns based on:
                        </p>
                        <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
                            <li>Expected return: {(inputs.accounts.taxDeferred.expectedReturnRate * 100).toFixed(1)}% average (tax-deferred account; each account uses its own rate)</li>
                            <li>Volatility (std dev): {(inputs.simulation.returnStdDeviation * 100).toFixed(0)}% variation</li>
                            <li>This creates returns ranging from approximately -{(inputs.simulation.returnStdDeviation * 100 * 2).toFixed(0)}% to +{(inputs.simulation.returnStdDeviation * 100 * 2).toFixed(0)}% in any given year</li>
                        </ul>
                        <p className="mt-2 text-xs">
                            The wide range of outcomes reflects real market uncertainty and sequence of returns risk
                            (the risk that poor returns early in retirement can permanently damage your plan).
                        </p>
                    </div>
                </div>
            </div>

            {/* Original Assumptions Sections */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
                <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Assumptions & Limitations</h3>
                        <p className="text-sm text-gray-600">
                            This tool uses simplified assumptions for educational planning purposes.
                            Actual results will vary. Always consult with qualified professionals.
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Investment Assumptions */}
                    <AssumptionSection title="Investment Assumptions">
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                            <li>
                                Returns modeled as a normal distribution
                                (mean: {(inputs.accounts.taxDeferred.expectedReturnRate * 100).toFixed(1)}%,
                                std dev: {(inputs.simulation.returnStdDeviation * 100).toFixed(0)}%)
                            </li>
                            <li>All accounts share one market shock each year (perfectly correlated) — no diversification benefit between accounts is modeled</li>
                            <li>Does not capture extreme market crashes or fat-tail events (e.g., 2008 financial crisis)</li>
                            <li>Returns are capped at -50% to +50% per year to prevent extreme outliers (covers the vast majority of realistic annual outcomes)</li>
                            <li>No modeling of transaction costs, management fees, or tax-loss harvesting</li>
                        </ul>
                    </AssumptionSection>

                    {/* Tax Assumptions */}
                    <AssumptionSection title="Tax Assumptions">
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                            <li>
                                Applies a single marginal rate
                                ({(inputs.tax.combinedEffectiveRate * 100).toFixed(1)}%) to taxable
                                income above the standard deduction — not the full 10–37% brackets
                            </li>
                            <li>
                                Models the standard deduction using <strong>2026</strong> amounts
                                (base + age-65 additions + the 2025–2028 OBBBA senior bonus); assumes
                                a {(inputs.personal.filingStatus ?? 'single').replace('_', ' ')} filer
                            </li>
                            {inputs.personal.filingStatus === 'married_joint' && (
                                <>
                                    <li>
                                        <strong>Married filing jointly:</strong> both spouses' Social Security
                                        benefits are combined for the provisional-income formula, and accounts
                                        are <strong>pooled</strong> with one RMD start age (the older spouse's).
                                        The survivor's penalty is <strong>not</strong> modeled — both spouses are
                                        assumed to live to the shared life expectancy.
                                    </li>
                                    <li>
                                        <strong>A spouse's earned income is not modeled.</strong> Part-time work is
                                        treated entirely as <em>your</em> wages, so it drives only your Social
                                        Security earnings test; the spouse's benefit gets no earnings test at all.
                                        Pension and rental start ages also run on your timeline, not the spouse's.
                                    </li>
                                </>
                            )}
                            <li>
                                Social Security taxability uses the IRS provisional-income formula
                                (0–85%), capped at your setting of {(inputs.income.socialSecurity.taxablePercentage * 100).toFixed(0)}%;
                                thresholds are not inflation-indexed (the "tax torpedo")
                            </li>
                            <li>Long-term capital gains taxed at the flat rate — the 0%/15%/20% brackets are NOT modeled</li>
                            <li>
                                Taxable-account withdrawals split into gain vs. cost basis using a single fixed
                                percentage ({((inputs.accounts.taxable.costBasisPercentage ?? 0.7) * 100).toFixed(0)}% basis) —
                                it stays constant instead of rising over time as more of the account's growth gets realized
                            </li>
                            <li>No itemized deductions or tax credits</li>
                            {stateDisclosure && stateTaxComputed ? (
                                <>
                                    <li>
                                        <strong>State tax ({inputs.personal.state}):</strong> {stateDisclosure.summary} —
                                        computed by the tool, so the marginal rate above is your <strong>federal</strong> rate only
                                    </li>
                                    {stateDisclosure.caveat && (
                                        <li className="text-amber-800">{stateDisclosure.caveat}</li>
                                    )}
                                </>
                            ) : (
                                <li>
                                    <strong>State tax ({inputs.personal.state}) is NOT modeled</strong> — your
                                    marginal rate is assumed to cover federal <em>and</em> state. Many states exempt
                                    Social Security and some retirement income, so a blended rate can be well off
                                </li>
                            )}
                            <li>
                                Curious how another state would compare? Try the{' '}
                                <Link to="/state-tax-comparison" className="underline font-medium">
                                    State Tax Comparison
                                </Link>{' '}
                                tool.
                            </li>
                            <li>IRMAA (Medicare surcharges) estimated by user, not calculated from precise MAGI</li>
                            <li>RMDs enforced starting at age {RMD_START_AGE} (SECURE 2.0 start age for anyone born 1960+, which covers this tool's FIRE audience; born 1951–1959 would be 73){inputs.personal.filingStatus === 'married_joint' ? '. For couples, one household RMD on the pooled balance begins when the older spouse reaches 75' : ''}</li>
                            <li>
                                Withdrawal order:{' '}
                                <strong>
                                    {(inputs.withdrawalStrategy.strategy ?? 'tax_smart') === 'standard'
                                        ? 'Standard (taxable → tax-deferred → Roth)'
                                        : (inputs.withdrawalStrategy.strategy ?? 'tax_smart') === 'roth_conversion'
                                            ? 'Gap-year Roth conversions'
                                            : 'Tax-smart sequencing (fills the standard deduction from tax-deferred in gap years)'}
                                </strong>
                                {' '}— assumes you follow this order in real life
                            </li>
                            {inputs.rothConversion?.enabled && (
                                <li>
                                    Roth conversions:{' '}
                                    <strong>
                                        ages {inputs.rothConversion.startAge}–{inputs.rothConversion.endAge},{' '}
                                        {inputs.rothConversion.strategyType === 'fixed_amount'
                                            ? `${formatMoney(inputs.rothConversion.fixedAmount ?? 0)}/year`
                                            : `fill the ${((inputs.rothConversion.targetTaxBracket ?? 0.12) * 100).toFixed(0)}% bracket`}
                                        , tax paid from {inputs.rothConversion.payTaxFromAccount === 'taxable_cash' ? 'taxable cash' : 'conversion proceeds'}
                                    </strong>
                                </li>
                            )}
                        </ul>
                    </AssumptionSection>

                    {/* Healthcare Assumptions */}
                    <AssumptionSection title="Healthcare Assumptions">
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                            <li>
                                Medicare premiums based on 2025 rates, inflated at {(inputs.simulation.healthcareInflationRate * 100).toFixed(1)}% annually
                            </li>
                            <li>Out-of-pocket costs are estimates and vary significantly by individual health</li>
                            <li>
                                <strong className="text-red-700">Long-term care NOT modeled</strong> (nursing homes, assisted living: $50K-$150K+/year)
                            </li>
                            <li>Does not account for catastrophic health events or disability</li>
                            <li>ACA subsidies for pre-Medicare coverage not calculated</li>
                        </ul>
                    </AssumptionSection>

                    {/* Spending Assumptions */}
                    <AssumptionSection title="Spending Assumptions">
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                            <li>
                                Spending constant within each phase, adjusted for
                                {(inputs.simulation.generalInflationRate * 100).toFixed(1)}% general inflation
                            </li>
                            <li><strong>No automatic spending adjustments</strong> for portfolio performance</li>
                            <li>No guardrails or dynamic spending rules (e.g., reducing spending during market downturns)</li>
                            <li>Does not model discretionary vs. non-discretionary expenses</li>
                            <li>One-time expenses inflated from retirement year, not from current year</li>
                        </ul>
                    </AssumptionSection>

                    {/* Mortality Assumptions */}
                    <AssumptionSection title="Mortality Assumptions">
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                            <li>
                                <strong>Fixed life expectancy</strong> at age {inputs.personal.lifeExpectancy}
                                (no probability distribution)
                            </li>
                            <li>50% of people live beyond average life expectancy - plan conservatively</li>
                            {inputs.personal.filingStatus === 'married_joint' ? (
                                <>
                                    <li>Both spouses assumed to live to the shared life expectancy (age {inputs.personal.lifeExpectancy})</li>
                                    <li><strong>Survivor's penalty not modeled</strong> — no switch to single filing on first death, and the smaller Social Security benefit is never dropped</li>
                                </>
                            ) : (
                                <>
                                    <li>Does not model joint life expectancy for couples</li>
                                    <li>No survivor benefits or spousal Social Security strategies</li>
                                </>
                            )}
                        </ul>
                    </AssumptionSection>
                </div>
            </div>

            {/* What's NOT Modeled - Expanded */}
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6">
                <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                    <h3 className="text-lg font-semibold text-red-900">
                        Critical Exclusions - What's NOT Modeled
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-red-800">
                    <div>
                        <h4 className="font-semibold mb-2">Financial:</h4>
                        <ul className="list-disc list-inside space-y-1">
                            <li><strong>The 10% early-withdrawal penalty</strong> on tax-deferred (401k/IRA) withdrawals before age 59½ — and the strategies that legitimately avoid it (Roth conversion ladder, 72(t)/SEPP, the rule of 55). If you retire before 59½ this plan understates the tax on those draws</li>
                            <li><strong>Non-income state and local taxes</strong> — sales, property, excise, and estate/inheritance taxes. A state with no income tax is not automatically a low-tax state: several fund themselves through high property or sales tax instead, so this tool's state figure is not a total tax burden</li>
                            <li>Asset correlations between accounts</li>
                            <li>Sequence of returns risk mitigation strategies</li>
                            <li>Dynamic asset allocation (glide paths)</li>
                            <li>Inflation variability (uses fixed rates)</li>
                            <li><strong>Primary residence:</strong> Home equity, mortgage payments, property taxes, home appreciation, reverse mortgages, or HELOC interest costs</li>
                            <li>Business income or equity compensation</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Life Events:</h4>
                        <ul className="list-disc list-inside space-y-1">
                            <li><strong>Long-term care costs</strong> (major expense!)</li>
                            <li>Survivor's penalty (surviving-spouse tax jump on first death)</li>
                            <li>Inheritance or windfalls</li>
                            <li>Major medical events</li>
                            <li>Divorce, remarriage, or family changes</li>
                            <li>Housing changes (downsizing, relocation)</li>
                        </ul>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-red-300">
                    <p className="text-sm text-red-900 font-semibold">
                        💡 Recommendation: Build in a safety margin of 10-20% above minimum success rate to account for these unknowns.
                    </p>
                </div>
            </div>

            {/* Common Questions - EXPANDED */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-3 mb-4">
                    <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <h3 className="text-lg font-semibold text-blue-900">
                        Common Questions
                    </h3>
                </div>
                <div className="space-y-4 text-sm text-blue-900">
                    {/* House Question */}
                    <div>
                        <h4 className="font-semibold mb-1">Q: How do I include my house in retirement planning?</h4>
                        <p className="mb-2">
                            Your primary residence is typically NOT included as a liquid retirement asset because
                            you need somewhere to live — by default, just leave it out of your plan.
                        </p>
                        <p className="mb-1">
                            If you plan to downsize, model it directly: add a One-Time Expense in Step 1 for moving
                            costs at your planned sale age, add the net sale proceeds to your Taxable Account
                            balance, and lower your spending afterward to reflect the smaller home.
                        </p>
                        <p className="text-xs mt-2 text-blue-800 italic">
                            What we DON'T model: mortgage payments, property taxes, home appreciation vs inflation,
                            or tapping equity via a reverse mortgage or HELOC while staying in the home.
                        </p>
                    </div>

                    {/* Bonds in 401k */}
                    <div>
                        <h4 className="font-semibold mb-1">Q: Where do I enter bonds in my 401(k)?</h4>
                        <p className="mb-1">
                            Calculate a blended return rate across all assets in that account.
                        </p>
                        <p className="font-medium mb-1">Example:</p>
                        <ul className="ml-4 space-y-1 text-xs">
                            <li>• 60% stocks (expect 9% return) = 5.4%</li>
                            <li>• 40% bonds (expect 4% return) = 1.6%</li>
                            <li>• <strong>Blended return: 7.0%</strong></li>
                        </ul>
                        <p className="text-xs mt-1 text-blue-800 italic">
                            Enter 7% as the expected return for that Traditional IRA/401(k) account.
                        </p>
                    </div>

                    {/* Part-time work + Early SS */}
                    <div>
                        <h4 className="font-semibold mb-1">Q: I want to work part-time and claim Social Security early. What happens?</h4>
                        <p className="mb-1">
                            If you claim before Full Retirement Age (67) and earn above ~$22,000/year, the
                            <strong> Social Security earnings test</strong> reduces your benefits temporarily.
                        </p>
                        <p className="text-xs mt-1 text-blue-800">
                            This tool models the earnings test and will show reduced SS benefits when both conditions apply.
                            After you reach FRA, benefits are no longer reduced by work income.
                        </p>
                    </div>

                    {/* Bank / HYSA cash */}
                    <div>
                        <h4 className="font-semibold mb-1">Q: How do I enter money in bank or HYSA accounts?</h4>
                        <p className="mb-1">
                            Add the balance to your <strong>Taxable Account</strong> — the tool only has three account
                            types (tax-deferred, Roth, taxable), and bank/HYSA cash is after-tax money like a
                            brokerage account. Set its expected return to your account's interest rate (e.g., 4–5%)
                            instead of a market return.
                        </p>
                        <p className="text-xs mt-1 text-blue-800">
                            One gap to know: this tool taxes taxable-account growth only when withdrawn, not
                            annually. Real HYSA interest is taxed as ordinary income every year it's earned, so a
                            large cash balance will owe slightly more real-world tax than this model shows.
                        </p>
                    </div>
                </div>
            </div>

            {/* Legal Disclaimer */}
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">⚖️ Legal Disclaimer</h4>
                <p className="text-xs text-gray-700 leading-relaxed">
                    <strong>Educational projections only.</strong> This tool is provided for informational and educational purposes.
                    It is not financial, tax, legal, or investment advice. Results are estimates based on simplified assumptions
                    and will not reflect actual outcomes. Past performance does not indicate future results. Markets are unpredictable
                    and losses are possible. Consult with qualified professionals (Certified Financial Planner, CPA, attorney) before
                    making retirement decisions. No warranties expressed or implied. Use at your own risk.
                </p>
            </div>
        </div>
    );
}

function AssumptionSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="border-l-4 border-blue-500 pl-4 py-2">
            <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
            {children}
        </div>
    );
}