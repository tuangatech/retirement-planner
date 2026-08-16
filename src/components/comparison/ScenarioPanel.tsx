import type { SavedScenario } from '@/lib/storage/scenarioStorage';
import { Info } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface ScenarioPanelProps {
    scenario: SavedScenario;
    side: 'left' | 'right';
}

export function ScenarioPanel({ scenario, side }: ScenarioPanelProps) {
    const borderColor = side === 'left' ? 'border-blue-500' : 'border-purple-500';
    const bgColor = side === 'left' ? 'bg-blue-50' : 'bg-purple-50';
    const textColor = side === 'left' ? 'text-blue-600' : 'text-purple-600';

    // Calculate total portfolio from inputs
    const totalPortfolio =
        scenario.inputs.accounts.taxDeferred.balanceAtRetirement +
        scenario.inputs.accounts.roth.balanceAtRetirement +
        scenario.inputs.accounts.taxable.balanceAtRetirement +
        scenario.inputs.accounts.hsa.balanceAtRetirement;

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        });
    };

    const { inputs } = scenario;

    // Legacy scenarios (saved before the feature) are normalized to 'standard' on load.
    const strategyLabels: Record<string, string> = {
        standard: 'Standard order',
        tax_smart: 'Tax-smart sequencing',
        roth_conversion: 'Gap-year Roth conversions',
    };
    const strategyLabel = strategyLabels[inputs.withdrawalStrategy.strategy ?? 'tax_smart'];

    return (
        <div className={`bg-white rounded-lg shadow-lg border-t-4 ${borderColor}`}>
            {/* Header */}
            <div className={`p-6 border-b border-gray-200 ${bgColor}`}>
                <div className={`text-xs font-semibold mb-1 ${textColor} uppercase tracking-wide`}>
                    Scenario {side === 'left' ? 'A' : 'B'}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">{scenario.name}</h2>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                        <span className="text-gray-600">Retirement Age:</span>
                        <span className="ml-2 font-medium">{inputs.personal.retirementAge}</span>
                    </div>
                    <div>
                        <span className="text-gray-600">Life Expectancy:</span>
                        <span className="ml-2 font-medium">{inputs.personal.lifeExpectancy}</span>
                    </div>
                    <div>
                        <span className="text-gray-600">Starting Portfolio:</span>
                        <span className="ml-2 font-medium">{formatCurrency(totalPortfolio)}</span>
                    </div>
                    <div>
                        <span className="text-gray-600">Retirement Duration:</span>
                        <span className="ml-2 font-medium">
                            {inputs.personal.lifeExpectancy - inputs.personal.retirementAge} years
                        </span>
                    </div>
                </div>
            </div>

            {/* Retirement Phases */}
            <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Retirement Phases</h3>
                <div className="space-y-3">
                    {inputs.phases.map((phase, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                            <div>
                                <span className="font-medium text-gray-700">
                                    {phase.name === 'go_go' ? '🏃 Go-Go Years' :
                                        phase.name === 'slow_go' ? '🚶 Slow-Go Years' :
                                            '🏠 No-Go Years'}
                                </span>
                                <span className="text-gray-500 ml-2">
                                    (Ages {phase.startAge}-{phase.endAge})
                                </span>
                            </div>
                            <span className="font-semibold text-gray-900">
                                {formatCurrency(phase.annualSpending)}/yr
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Investment Accounts</h3>
                <div className="space-y-3">
                    {inputs.accounts.taxDeferred.balanceAtRetirement > 0 && (
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Tax-Deferred (401k/IRA)</span>
                            <span className="font-medium">
                                {formatCurrency(inputs.accounts.taxDeferred.balanceAtRetirement)}
                            </span>
                        </div>
                    )}
                    {inputs.accounts.roth.balanceAtRetirement > 0 && (
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Roth</span>
                            <span className="font-medium">
                                {formatCurrency(inputs.accounts.roth.balanceAtRetirement)}
                            </span>
                        </div>
                    )}
                    {inputs.accounts.taxable.balanceAtRetirement > 0 && (
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Taxable Brokerage</span>
                            <span className="font-medium">
                                {formatCurrency(inputs.accounts.taxable.balanceAtRetirement)}
                            </span>
                        </div>
                    )}
                    {inputs.accounts.hsa.balanceAtRetirement > 0 && (
                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-1.5">
                                <span className="text-gray-600">HSA (Health Savings)</span>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Info className="w-3.5 h-3.5 text-gray-400 cursor-help hover:text-gray-600" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                            <p className="font-semibold mb-1">HSA offers Triple tax advantage</p>
                                            <ul className="text-xs space-y-1">
                                                <li>• Tax-deductible contributions</li>
                                                <li>• Tax-free growth</li>
                                                <li>• Tax-free withdrawals for medical expenses</li>
                                            </ul>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            <span className="font-medium">
                                {formatCurrency(inputs.accounts.hsa.balanceAtRetirement)}
                            </span>
                        </div>
                    )}
                    <div className="pt-3 mt-3 border-t border-gray-200 flex justify-between items-center">
                        <span className="font-semibold text-gray-900">Total Portfolio</span>
                        <span className="font-bold text-gray-900 text-lg">
                            {formatCurrency(totalPortfolio)}
                        </span>
                    </div>
                    <div className="pt-3 mt-3 border-t border-gray-200 flex justify-between items-center text-sm">
                        <span className="text-gray-600">Withdrawal Strategy</span>
                        <span className="font-medium">{strategyLabel}</span>
                    </div>
                </div>
            </div>

            {/* Income Sources */}
            <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Income Sources</h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Social Security (claim age)</span>
                        <span className="font-medium">
                            Age {inputs.income.socialSecurity.claimingAge} •
                            {formatCurrency(inputs.income.socialSecurity.monthlyBenefitAtFRA * 12)}/yr
                        </span>
                    </div>

                    {inputs.income.pensions.length > 0 && (
                        <div className="text-sm">
                            <span className="text-gray-600">Pensions:</span>
                            {inputs.income.pensions.map((pension, idx) => (
                                <div key={idx} className="ml-4 mt-1 flex justify-between">
                                    <span className="text-gray-500">{pension.name}</span>
                                    <span className="font-medium">
                                        {formatCurrency(pension.monthlyAmount * 12)}/yr
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {inputs.income.partTimeWork.enabled && (
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">
                                Part-Time Work (ages {inputs.income.partTimeWork.startAge}-{inputs.income.partTimeWork.endAge})
                            </span>
                            <span className="font-medium">
                                {formatCurrency(inputs.income.partTimeWork.annualIncome)}/yr
                            </span>
                        </div>
                    )}

                    {inputs.income.rentalIncome.enabled && (
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Rental Income (net)</span>
                            <span className="font-medium">
                                {formatCurrency(inputs.income.rentalIncome.annualNetIncome)}/yr
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Healthcare */}
            <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Healthcare Costs</h3>
                <div className="space-y-3 text-sm">
                    {inputs.personal.retirementAge < 65 && (
                        <div>
                            <div className="font-medium text-gray-700 mb-1">Pre-Medicare (Age &lt; 65)</div>
                            <div className="ml-4 space-y-1 text-gray-600">
                                <div className="flex justify-between">
                                    <span>Monthly Premium:</span>
                                    <span>{formatCurrency(inputs.healthcare.preMedicare.monthlyPremium)}/mo</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Annual Out-of-Pocket:</span>
                                    <span>{formatCurrency(inputs.healthcare.preMedicare.annualOutOfPocket)}/yr</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <div className="font-medium text-gray-700 mb-1">Medicare (Age ≥ 65)</div>
                        <div className="ml-4 space-y-1 text-gray-600">
                            <div className="flex justify-between">
                                <span>Total Monthly Premiums:</span>
                                <span>
                                    {formatCurrency(
                                        inputs.healthcare.medicare.partBStandardPremium +
                                        inputs.healthcare.medicare.partDPremium +
                                        inputs.healthcare.medicare.medigapPremium +
                                        (inputs.healthcare.medicare.expectIRMAA ? inputs.healthcare.medicare.irmaaSurcharge : 0)
                                    )}/mo
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Out-of-Pocket (Go-Go):</span>
                                <span>{formatCurrency(inputs.healthcare.medicare.outOfPocketByPhase.phase1)}/yr</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}