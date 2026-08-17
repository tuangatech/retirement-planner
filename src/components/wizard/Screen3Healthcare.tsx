// src/components/wizard/Screen3Healthcare.tsx

import { useInputs } from '@/contexts/InputsContext';
import { DEFAULT_VALUES } from '@/lib/constants';
import { AlertCircle } from 'lucide-react';
import { CollapsibleHelpPanel } from '@/components/common/CollapsibleHelpPanel';
import { CurrencyField } from '@/components/common/CurrencyField';
import { HelpPopover } from '@/components/common/HelpPopover';
import { InlineGuidance } from '@/components/common/InlineGuidance';
import { ScopeBadge } from '@/components/common/ScopeBadge';

export function Screen3Healthcare() {
    const { inputs, updateHealthcare } = useInputs();
    const { healthcare, mode, personal } = inputs;

    const isMFJ = personal.filingStatus === 'married_joint';
    const hasPreMedicareGap = personal.retirementAge < 65;
    const preMedicareYears = hasPreMedicareGap ? 65 - personal.retirementAge : 0;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                    Healthcare Costs
                    {isMFJ && <ScopeBadge scope="per-person" />}
                </h2>
                <p className="text-gray-600">Estimate your healthcare expenses before and during Medicare</p>
                {isMFJ && (
                    <p className="text-sm text-gray-500 mt-2">
                        Enter these as <strong>per-person</strong> costs — applied to each spouse on their own
                        Medicare timeline (pre-Medicare until their own 65, then Medicare) and summed. Both spouses
                        are assumed to have equal per-person costs.
                    </p>
                )}
            </div>

            {/* Educational Overview */}
            <CollapsibleHelpPanel
                title="Understanding Retirement Healthcare Costs"
                variant="info"
            >
                <div className="space-y-3">
                    <p>
                        Healthcare is typically one of the largest retirement expenses after housing.
                        A 65-year-old couple may need <strong>$300,000+</strong> for healthcare in retirement.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="bg-white border border-blue-200 rounded-lg p-3">
                            <h5 className="font-semibold text-blue-900 mb-2">Pre-Medicare (Age &lt; 65)</h5>
                            <ul className="text-sm text-gray-700 space-y-2">
                                <li>Challenge: most expensive years if retiring early</li>
                                <li>Options: COBRA, ACA marketplace, spouse's plan, retiree coverage</li>
                                <li>Typical cost: $600–1,200/month per person</li>
                                <li>Subsidies: may qualify for ACA subsidies based on income</li>
                            </ul>
                        </div>
                        <div className="bg-white border border-blue-200 rounded-lg p-3">
                            <h5 className="font-semibold text-blue-900 mb-2">Medicare (Age ≥ 65)</h5>
                            <ul className="text-sm text-gray-700 space-y-2">
                                <li>Part A: hospital (usually free)</li>
                                <li>Part B: doctor visits (~$185/mo in 2025)</li>
                                <li>Part D: prescriptions (~$50/mo average)</li>
                                <li>Medigap: supplemental coverage ($150–250/mo)</li>
                                <li>Out-of-pocket: increases with age/health</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </CollapsibleHelpPanel>

            {/* Pre-Medicare Gap Warning */}
            {hasPreMedicareGap && (
                <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-orange-900 mb-2">
                                Pre-Medicare Coverage Gap: {preMedicareYears} Years
                            </h4>
                            <p className="text-sm text-orange-800">
                                You're planning to retire at age {personal.retirementAge}, but Medicare
                                doesn't start until age 65. You'll need coverage for {preMedicareYears} years.
                            </p>
                            <p className="text-sm text-orange-800 mt-2">
                                Common options: COBRA (18–36 months), ACA marketplace,
                                spouse's employer plan, or retiree health benefits.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Pre-Medicare */}
            <div className="border rounded-lg p-5 bg-gradient-to-r from-blue-50 to-white">
                <div className="mb-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        Pre-Medicare (Age &lt; 65)
                        <HelpPopover title="Pre-Medicare Coverage Options">
                            <p className="mb-2">Coverage options ranked by typical cost:</p>
                            <ol className="list-decimal ml-4 space-y-2 text-sm">
                                <li>Spouse's employer plan: often least expensive if available</li>
                                <li>Retiree health benefits: some employers offer this (rare)</li>
                                <li>ACA marketplace: may qualify for subsidies based on income</li>
                                <li>COBRA: continue employer plan (18–36 months max, expensive)</li>
                                <li>Private insurance: most expensive option</li>
                            </ol>
                            <p className="mt-3 text-xs text-gray-600">
                                💡 ACA subsidies can significantly reduce costs for early retirees with lower taxable income
                            </p>
                        </HelpPopover>
                    </h3>
                    <p className="text-sm text-gray-600">
                        {hasPreMedicareGap
                            ? `Coverage from age ${personal.retirementAge} to 64 (${preMedicareYears} years)`
                            : "You'll be Medicare-eligible when you retire"
                        }
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CurrencyField
                        label="Monthly Insurance Premium"
                        value={healthcare.preMedicare.monthlyPremium}
                        onChange={(monthlyPremium) =>
                            updateHealthcare('preMedicare', { ...healthcare.preMedicare, monthlyPremium })
                        }
                        step={25}
                        helperText="Typical: $600–1,200/month per person"
                    />

                    <CurrencyField
                        label="Annual Out-of-Pocket Expenses (Age < 65)"
                        value={healthcare.preMedicare.annualOutOfPocket}
                        onChange={(annualOutOfPocket) =>
                            updateHealthcare('preMedicare', { ...healthcare.preMedicare, annualOutOfPocket })
                        }
                        step={100}
                        helperText="Deductibles, copays, prescriptions"
                    />
                </div>

                <InlineGuidance variant="example" className="mt-3">
                    <strong>Example:</strong> COBRA continuation from employer: $900/month premium + $3,000/year out-of-pocket = $13,800/year total
                </InlineGuidance>
            </div>

            {/* Medicare */}
            <div className="border rounded-lg p-5 bg-gradient-to-r from-green-50 to-white">
                <div className="mb-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        Medicare (Age ≥ 65)
                        <HelpPopover title="Medicare Basics">
                            <p className="mb-2">The four parts of Medicare:</p>
                            <ul className="space-y-2 text-sm">
                                <li>Part A (Hospital): usually free if you worked 40+ quarters</li>
                                <li>Part B (Medical): doctor visits, outpatient care — standard premium ~$200/mo (2025)</li>
                                <li>Part C (Advantage): alternative to Original Medicare (not modeled here)</li>
                                <li>Part D (Drugs): prescription coverage — average ~$55/mo</li>
                                <li>Medigap: supplemental insurance to cover gaps — $150-250/mo typical</li>
                            </ul>
                        </HelpPopover>
                    </h3>
                    <p className="text-sm text-gray-600">Comprehensive coverage with multiple parts</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <CurrencyField
                        label="Part B Standard Premium"
                        help={
                            <HelpPopover>
                                <p className="mb-2">Covers doctor visits, outpatient care, preventive services.</p>
                                <p className="font-medium mb-1">Pricing:</p>
                                <ul className="list-disc ml-4 space-y-1 text-sm">
                                    <li>2025 base: $200/month</li>
                                    <li>Typically increases 3-5% annually</li>
                                    <li>The simulator applies the healthcare inflation rate from Step 6 (default {(DEFAULT_VALUES.simulation.healthcareInflationRate * 100).toFixed(0)}%)</li>
                                </ul>
                            </HelpPopover>
                        }
                        value={healthcare.medicare.partBStandardPremium}
                        onChange={(partBStandardPremium) =>
                            updateHealthcare('medicare', { ...healthcare.medicare, partBStandardPremium })
                        }
                        step={5}
                        suffix="/mo"
                    />

                    <CurrencyField
                        label="Part D Premium"
                        help={
                            <HelpPopover>
                                <p className="mb-2">Prescription drug coverage through private insurers.</p>
                                <p className="font-medium mb-1">Costs vary widely:</p>
                                <ul className="list-disc ml-4 mt-1 space-y-1 text-sm">
                                    <li>Basic plans: $30-50/month</li>
                                    <li>Enhanced plans: $80-150/month</li>
                                    <li>Average: ~$55/month (2025)</li>
                                </ul>
                                <p className="mt-2 text-xs text-gray-600">
                                    Choose based on your prescriptions and pharmacy network.
                                </p>
                            </HelpPopover>
                        }
                        value={healthcare.medicare.partDPremium}
                        onChange={(partDPremium) =>
                            updateHealthcare('medicare', { ...healthcare.medicare, partDPremium })
                        }
                        step={5}
                        suffix="/mo"
                    />

                    <CurrencyField
                        label="Medigap Premium"
                        help={
                            <HelpPopover title="Medigap (Supplemental Insurance)">
                                <p className="mb-2">
                                    Covers gaps in Original Medicare (copays, coinsurance, deductibles).
                                </p>
                                <p className="font-medium mb-1">Plan types (most popular):</p>
                                <ul className="list-disc ml-4 space-y-1 text-sm">
                                    <li>Plan F: most comprehensive (~$175-270/mo)</li>
                                    <li>Plan G: popular choice (~$150-250/mo)</li>
                                    <li>Plan N: lower premiums (~$120-150/mo)</li>
                                </ul>
                                <p className="mt-2 text-xs text-gray-600">
                                    💡 Plans vary by state and age — prices increase as you age
                                </p>
                            </HelpPopover>
                        }
                        value={healthcare.medicare.medigapPremium}
                        onChange={(medigapPremium) =>
                            updateHealthcare('medicare', { ...healthcare.medicare, medigapPremium })
                        }
                        step={5}
                        suffix="/mo"
                    />

                    {mode === 'advanced' && (
                        <div>
                            <div className="flex items-center mb-2">
                                <input
                                    type="checkbox"
                                    id="expectIRMAA"
                                    checked={healthcare.medicare.expectIRMAA}
                                    onChange={(e) =>
                                        updateHealthcare('medicare', {
                                            ...healthcare.medicare,
                                            expectIRMAA: e.target.checked,
                                        })
                                    }
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <label htmlFor="expectIRMAA" className="ml-2 text-sm font-medium flex items-center gap-1">
                                    Expect to Pay IRMAA?
                                    <HelpPopover title="IRMAA (Income-Related Adjustment)">
                                        <p className="mb-2">
                                            High-income retirees pay additional premiums for Part B and Part D.
                                        </p>
                                        <p className="font-medium mb-1">2025 income thresholds (single filer):</p>
                                        <table className="w-full text-xs mt-2 border border-gray-300">
                                            <thead>
                                                <tr className="bg-gray-100">
                                                    <th className="border border-gray-300 p-1 text-left">Income</th>
                                                    <th className="border border-gray-300 p-1 text-left">Part B Surcharge</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td className="border border-gray-300 p-1">≤$106k</td>
                                                    <td className="border border-gray-300 p-1">$0</td>
                                                </tr>
                                                <tr>
                                                    <td className="border border-gray-300 p-1">$106k–$133k</td>
                                                    <td className="border border-gray-300 p-1">+$70/mo</td>
                                                </tr>
                                                <tr>
                                                    <td className="border border-gray-300 p-1">$133k–$167k</td>
                                                    <td className="border border-gray-300 p-1">+$175/mo</td>
                                                </tr>
                                                <tr>
                                                    <td className="border border-gray-300 p-1">$500k+</td>
                                                    <td className="border border-gray-300 p-1">+$420/mo</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        <p className="mt-2 text-xs text-gray-600">
                                            Based on income from 2 years prior.
                                        </p>
                                    </HelpPopover>
                                </label>
                            </div>
                            {healthcare.medicare.expectIRMAA && (
                                <CurrencyField
                                    value={healthcare.medicare.irmaaSurcharge}
                                    onChange={(irmaaSurcharge) =>
                                        updateHealthcare('medicare', { ...healthcare.medicare, irmaaSurcharge })
                                    }
                                    step={10}
                                    suffix="/mo"
                                />
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                                Income surcharge for high earners ($70–$420/mo)
                            </p>
                        </div>
                    )}
                </div>

                <div className="border-t pt-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                        Annual Out-of-Pocket by Phase (Age ≥ 65)
                        <HelpPopover title="Why Out-of-Pocket Increases with Age">
                            <p className="mb-2">
                                Healthcare needs typically increase as you age, even with Medicare.
                            </p>
                            <p className="font-medium mb-1">Common age-related expenses:</p>
                            <ul className="list-disc ml-4 space-y-1 text-sm">
                                <li>More frequent doctor visits</li>
                                <li>Increased prescriptions</li>
                                <li>Medical equipment (walker, wheelchair)</li>
                                <li>Home modifications for safety</li>
                                <li>Chronic condition management</li>
                            </ul>
                            <p className="mt-2 text-xs text-gray-600">
                                💡 These estimates do not include long-term care costs
                            </p>
                        </HelpPopover>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <CurrencyField
                            label="Go-Go Years"
                            value={healthcare.medicare.outOfPocketByPhase.phase1}
                            onChange={(phase1) =>
                                updateHealthcare('medicare', {
                                    ...healthcare.medicare,
                                    outOfPocketByPhase: { ...healthcare.medicare.outOfPocketByPhase, phase1 },
                                })
                            }
                            step={100}
                        />

                        <CurrencyField
                            label="Slow-Go Years"
                            value={healthcare.medicare.outOfPocketByPhase.phase2}
                            onChange={(phase2) =>
                                updateHealthcare('medicare', {
                                    ...healthcare.medicare,
                                    outOfPocketByPhase: { ...healthcare.medicare.outOfPocketByPhase, phase2 },
                                })
                            }
                            step={100}
                        />

                        <CurrencyField
                            label="No-Go Years"
                            value={healthcare.medicare.outOfPocketByPhase.phase3}
                            onChange={(phase3) =>
                                updateHealthcare('medicare', {
                                    ...healthcare.medicare,
                                    outOfPocketByPhase: { ...healthcare.medicare.outOfPocketByPhase, phase3 },
                                })
                            }
                            step={100}
                        />
                    </div>
                </div>

                <div className="bg-green-100 border-2 border-green-300 rounded-md p-3 mt-4">
                    <p className="text-sm font-semibold text-green-900 mb-1">
                        Example: Total Medicare Cost Estimate (Go-Go Years):
                    </p>
                    <p className="text-sm text-green-800">
                        Part B (${healthcare.medicare.partBStandardPremium * 12}/year) +
                        Part D (${healthcare.medicare.partDPremium * 12}/year) +
                        Medigap (${healthcare.medicare.medigapPremium * 12}/year) +
                        Out-of-pocket (${healthcare.medicare.outOfPocketByPhase.phase1}/year)
                        {healthcare.medicare.expectIRMAA && ` + IRMAA ($${healthcare.medicare.irmaaSurcharge * 12}/year)`}
                        {' '}= <strong className="text-green-900">${(
                            (healthcare.medicare.partBStandardPremium +
                                healthcare.medicare.partDPremium +
                                healthcare.medicare.medigapPremium +
                                (healthcare.medicare.expectIRMAA ? healthcare.medicare.irmaaSurcharge : 0)) * 12 +
                            healthcare.medicare.outOfPocketByPhase.phase1
                        ).toLocaleString()}/year</strong>
                    </p>
                </div>
            </div>

            {/* Warning about Long-Term Care */}
            <CollapsibleHelpPanel
                title="Important: Long-Term Care NOT Modeled"
                variant="warning"
            >
                <p>
                    This simulator does <strong>not</strong> include long-term care costs, which can be substantial:
                </p>
                <ul className="space-y-1 ml-4 list-disc">
                    <li>Home health aide: $30-50/hour ($50,000-100,000/year for full-time)</li>
                    <li>Assisted living: $50,000-70,000/year average</li>
                    <li>Nursing home: $100,000-150,000/year average</li>
                    <li>Memory care: $70,000-100,000/year</li>
                </ul>
                <p>
                    Consider: Long-term care insurance, Medicaid planning, or setting
                    aside additional funds for potential care needs.
                </p>
            </CollapsibleHelpPanel>
        </div>
    );
}