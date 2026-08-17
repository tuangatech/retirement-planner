// src/components/wizard/Screen1Plan.tsx
// Screen 1 of 4 — "Your Plan": filing status (the layout-driving mode selector),
// personal timeline, and phase-based spending. Merges the former Personal Info and
// Retirement Phases steps. Phase boundaries derive from retirement age / life expectancy,
// so the phase table updates live as the timeline changes (see the sync effect below).

import { useInputs } from '@/contexts/InputsContext';
import { US_STATES, DEFAULT_SPOUSE_AGE_AT_RETIREMENT } from '@/lib/constants';
import type { USState, RetirementPhase, OneTimeExpense } from '@/types';
import { Trash2, AlertCircle } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { CollapsibleHelpPanel } from '@/components/common/CollapsibleHelpPanel';
import { CurrencyField } from '@/components/common/CurrencyField';
import { HelpPopover } from '@/components/common/HelpPopover';
import { InlineGuidance } from '@/components/common/InlineGuidance';
import { ScopeBadge } from '@/components/common/ScopeBadge';
import { isStateModeled } from '@/lib/calculations/stateTaxRules';

const MIN_PHASE_SPENDING = 1000;

export function Screen1Plan() {
    const {
        inputs,
        updatePersonal,
        updateSpouseSocialSecurity,
        updatePhases,
        addOneTimeExpense,
        removeOneTimeExpense,
        updateOneTimeExpense,
    } = useInputs();
    const { personal, income, phases, oneTimeExpenses } = inputs;
    const { retirementAge, lifeExpectancy } = personal;

    const isMFJ = personal.filingStatus === 'married_joint';
    const retirementDuration = lifeExpectancy - retirementAge;

    const handleFilingStatusChange = (value: 'single' | 'married_joint') => {
        if (value === 'married_joint') {
            updatePersonal({
                filingStatus: 'married_joint',
                spouseAgeAtRetirement: personal.spouseAgeAtRetirement ?? DEFAULT_SPOUSE_AGE_AT_RETIREMENT,
            });
            if (!income.spouseSocialSecurity) {
                updateSpouseSocialSecurity({});
            }
        } else {
            updatePersonal({ filingStatus: 'single' });
        }
    };

    // ---- Phases (from the former Retirement Phases step) ----
    const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
    const [lastAddedId, setLastAddedId] = useState<string | null>(null);
    const descRefs = useRef<Record<string, HTMLInputElement | null>>({});

    // Keep phase boundaries in sync with the timeline: phase 1 starts at retirement,
    // phase 3 ends at life expectancy. Runs whenever those change on this same screen.
    useEffect(() => {
        const newPhases = [...phases] as [RetirementPhase, RetirementPhase, RetirementPhase];
        let changed = false;
        if (newPhases[0].startAge !== retirementAge) {
            newPhases[0] = { ...newPhases[0], startAge: retirementAge };
            changed = true;
        }
        if (newPhases[2].endAge !== lifeExpectancy) {
            newPhases[2] = { ...newPhases[2], endAge: lifeExpectancy };
            changed = true;
        }
        if (changed) updatePhases(newPhases);
    }, [retirementAge, lifeExpectancy]);

    useEffect(() => {
        if (lastAddedId && descRefs.current[lastAddedId]) {
            descRefs.current[lastAddedId]?.focus();
            setLastAddedId(null);
        }
    }, [lastAddedId, oneTimeExpenses]);

    const handlePhaseChange = (index: number, field: keyof RetirementPhase, value: any) => {
        const newPhases = [...phases] as [RetirementPhase, RetirementPhase, RetirementPhase];
        newPhases[index] = { ...newPhases[index], [field]: value };
        if (field === 'endAge') {
            if (index === 0) newPhases[1] = { ...newPhases[1], startAge: value + 1 };
            if (index === 1) newPhases[2] = { ...newPhases[2], startAge: value + 1 };
        }
        updatePhases(newPhases);
    };

    const handleExpenseChange = (id: string, field: keyof OneTimeExpense, value: any) => {
        updateOneTimeExpense(id, { [field]: value });
    };

    const handleAddExpense = () => {
        const id = Date.now().toString();
        addOneTimeExpense({ id, description: '', amount: 10000, age: retirementAge });
        setLastAddedId(id);
    };

    const handleRemoveExpense = (id: string) => {
        removeOneTimeExpense(id);
        setDirtyIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    };

    const invalidIds = new Set(
        oneTimeExpenses
            .filter(e => dirtyIds.has(e.id) && !e.description.trim())
            .map(e => e.id)
    );

    const isEndLocked = [false, false, true];
    const phaseLabels = [
        { title: 'Go-Go Years', subtitle: 'Active Retirement', description: 'Travel, hobbies, high activity', typicalAges: 'Typically 65-75' },
        { title: 'Slow-Go Years', subtitle: 'Moderate Retirement', description: 'Less travel, home-based', typicalAges: 'Typically 76-85' },
        { title: 'No-Go Years', subtitle: 'Late Retirement', description: 'Limited mobility', typicalAges: 'Typically 86+' },
    ];
    const endAgeMin = [retirementAge + 1, phases[0].endAge + 2, undefined];
    const endAgeMax = [phases[1].endAge - 1, lifeExpectancy - 1, undefined];
    const startAgeLabels = ['(set by retirement age)', '(= Phase 1 end + 1)', '(= Phase 2 end + 1)'];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold mb-2">Your Plan</h2>
                <p className="text-gray-600">Your filing status, retirement timeline, and phase-based spending</p>
            </div>

            {/* Filing status — the mode selector that drives later screens */}
            <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50/40">
                <label className="block text-sm font-semibold text-blue-900 mb-2">Tax Filing Status</label>
                <div className="inline-flex rounded-lg border border-blue-300 bg-white p-1">
                    {(['single', 'married_joint'] as const).map((value) => {
                        const active = (personal.filingStatus ?? 'single') === value;
                        return (
                            <button
                                key={value}
                                type="button"
                                onClick={() => handleFilingStatusChange(value)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                    active ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-blue-50'
                                }`}
                            >
                                {value === 'single' ? 'Single' : 'Married filing jointly'}
                            </button>
                        );
                    })}
                </div>
                <p className="text-xs text-gray-600 mt-2">
                    {isMFJ
                        ? 'Models both spouses’ Social Security and the joint standard deduction. Accounts are pooled; the survivor’s penalty is not modeled — see Disclosures.'
                        : 'Applies the single-filer standard deduction and Social Security thresholds.'}
                </p>
            </div>

            {/* How this tool works */}
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-1">How This Tool Works</h3>
                <p className="text-sm text-blue-800">
                    The simulator starts <strong>at your retirement age</strong> and projects to life expectancy.
                    Enter what you expect to have saved <strong>when you retire</strong>, not what you have today.
                </p>
                {isMFJ && (
                    <p className="text-sm text-blue-800 mt-2">
                        For couples, the projection follows <strong>your</strong> age. <strong>Life Expectancy</strong> is a
                        single shared horizon — both of you are assumed alive until then (the survivor’s penalty isn’t modeled).
                        Set your spouse’s age below so their Social Security and Medicare line up on your timeline.
                    </p>
                )}
            </div>

            {/* Timeline */}
            <div className="border rounded-lg p-5 space-y-4">
                <div className={`grid grid-cols-1 md:grid-cols-2 ${isMFJ ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
                    <div>
                        <label className="block text-sm font-medium mb-1">Retirement Age</label>
                        <input
                            type="number"
                            value={retirementAge}
                            onChange={(e) => updatePersonal({ retirementAge: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                            min="40"
                            max="75"
                        />
                        <p className="text-xs text-gray-500 mt-1">When you stop working (40-75)</p>
                    </div>
                    {isMFJ && (
                        <div>
                            <label className="block text-sm font-medium mb-1">Spouse’s Age at Retirement</label>
                            <input
                                type="number"
                                value={personal.spouseAgeAtRetirement ?? DEFAULT_SPOUSE_AGE_AT_RETIREMENT}
                                onChange={(e) => updatePersonal({ spouseAgeAtRetirement: parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                                min="40"
                                max="90"
                            />
                            <p className="text-xs text-gray-500 mt-1">Their age the year you retire</p>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium mb-1">Life Expectancy</label>
                        <input
                            type="number"
                            value={lifeExpectancy}
                            onChange={(e) => updatePersonal({ lifeExpectancy: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                            min="70"
                            max="110"
                        />
                        <p className="text-xs text-gray-500 mt-1">How long money must last</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">State</label>
                        <select
                            value={personal.state}
                            onChange={(e) => updatePersonal({ state: e.target.value as USState })}
                            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                        >
                            {/* Grouped rather than filtered: every state stays selectable so a
                                saved scenario keeps the user's real state and upgrades for free
                                when that state gets modeled. */}
                            <optgroup label="Tax computed automatically">
                                {US_STATES.filter(s => isStateModeled(s.value)).map(state => (
                                    <option key={state.value} value={state.value}>{state.label}</option>
                                ))}
                            </optgroup>
                            <optgroup label="Not modeled — add your state’s rate manually">
                                {US_STATES.filter(s => !isStateModeled(s.value)).map(state => (
                                    <option key={state.value} value={state.value}>{state.label}</option>
                                ))}
                            </optgroup>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            {isStateModeled(personal.state)
                                ? `${personal.state} state tax is computed for you`
                                : 'Tax guidance only; this state’s rules aren’t modeled'}
                        </p>
                    </div>
                </div>

                {/* Resulting duration — or a validation warning when the span is invalid.
                    Neutral color (a computed span, not a "good"/"bad" signal). */}
                {lifeExpectancy > retirementAge ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-800">Retirement Duration</p>
                                <p className="text-xs text-slate-500">How long your portfolio needs to last</p>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-bold text-slate-900">{retirementDuration}</p>
                                <p className="text-xs text-slate-500">years</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                        <p className="text-sm text-yellow-800">⚠️ Life expectancy must be greater than retirement age</p>
                    </div>
                )}
            </div>

            {/* ---- Retirement Phases ---- */}
            <div className="border-t pt-6">
                <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                    Retirement Phases
                    {isMFJ && <ScopeBadge scope="household" />}
                </h3>
                <p className="text-gray-600 mb-4">
                    {isMFJ
                        ? 'Your household spending for each phase — phase boundaries follow your age'
                        : 'Your spending for each phase of retirement'}
                </p>

                <CollapsibleHelpPanel title="Understanding the Three Phases of Retirement" variant="info" defaultOpen={false}>
                    <div className="space-y-4">
                        <p>Research shows retirement spending typically follows three phases; modeling them makes projections more realistic.</p>
                        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                            <p className="text-sm font-semibold text-yellow-900 mb-1">⚠️ Healthcare is entered separately</p>
                            <p className="text-xs text-yellow-800">
                                These amounts cover <strong>non-healthcare</strong> living costs. Healthcare premiums and
                                out-of-pocket costs are modeled in Step 3 and added automatically.
                            </p>
                        </div>
                        <p className="text-xs text-gray-600 italic">💡 Enter spending in today’s dollars — the simulator adjusts for inflation.</p>
                    </div>
                </CollapsibleHelpPanel>

                <div className="space-y-4 mt-4">
                    {phases.map((phase, index) => (
                        <div key={phase.name} className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-white">
                            <div className="mb-3">
                                <h4 className="font-semibold text-lg flex items-center gap-2">
                                    {phaseLabels[index].title}
                                    <HelpPopover title={`${phaseLabels[index].title} Guidelines`}>
                                        <p className="mb-2 text-gray-500">{phaseLabels[index].subtitle} · {phaseLabels[index].typicalAges}</p>
                                        <p className="mb-2">{phaseLabels[index].description}</p>
                                        <p className="font-medium">Typical expenses to include:</p>
                                        <ul className="list-disc ml-4 mt-2 space-y-1">
                                            {index === 0 && (<><li>Travel and vacations</li><li>Hobbies and recreation</li><li>Entertainment and dining</li></>)}
                                            {index === 1 && (<><li>Reduced/local travel</li><li>Home-based activities</li><li>Routine household costs</li></>)}
                                            {index === 2 && (<><li>Basic housing and food</li><li>Possible assisted-living fees</li><li>Limited discretionary spending</li></>)}
                                        </ul>
                                    </HelpPopover>
                                </h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        Start Age <span className="ml-1 text-xs text-gray-500 font-normal">{startAgeLabels[index]}</span>
                                    </label>
                                    <input type="number" value={phase.startAge} disabled
                                        className="w-full px-3 py-2 border rounded-md bg-gray-100 text-gray-500 cursor-not-allowed" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        End Age {isEndLocked[index] && <span className="ml-1 text-xs text-gray-500 font-normal">(set by life expectancy)</span>}
                                    </label>
                                    <input
                                        type="number"
                                        value={phase.endAge}
                                        onChange={(e) => handlePhaseChange(index, 'endAge', parseInt(e.target.value) || 0)}
                                        disabled={isEndLocked[index]}
                                        min={endAgeMin[index]}
                                        max={endAgeMax[index]}
                                        className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${isEndLocked[index] ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                    />
                                </div>
                                <CurrencyField
                                    label="Annual Spending (Today’s $)"
                                    value={phase.annualSpending}
                                    onChange={(annualSpending) =>
                                        handlePhaseChange(index, 'annualSpending', Math.max(MIN_PHASE_SPENDING, annualSpending))
                                    }
                                    step={1000}
                                    min={MIN_PHASE_SPENDING}
                                />
                            </div>

                            <InlineGuidance variant="example" className="mt-3">
                                {index === 0 && <><strong>Example:</strong> $65,000/year — comfortable living, travel, hobbies (excludes healthcare)</>}
                                {index === 1 && <><strong>Example:</strong> $50,000/year — reduced travel, home-based (excludes healthcare)</>}
                                {index === 2 && <><strong>Example:</strong> $40,000/year — basic living costs (healthcare added separately in Step 3)</>}
                            </InlineGuidance>
                        </div>
                    ))}
                </div>

                {/* One-time expenses */}
                <div className="mt-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                        <div>
                            <h4 className="font-semibold text-lg flex items-center gap-2">
                                One-Time Major Expenses
                                {isMFJ && <ScopeBadge scope="household" />}
                                <HelpPopover title="When to Use One-Time Expenses">
                                    <p className="mb-2">Large, planned one-off costs:</p>
                                    <ul className="list-disc ml-4 space-y-1">
                                        <li>Vehicle purchases</li>
                                        <li>Major trips</li>
                                        <li>Home improvements (roof, HVAC)</li>
                                    </ul>
                                    <p className="mt-3 text-xs text-gray-600">💡 Don’t include recurring costs already in phase spending.</p>
                                </HelpPopover>
                            </h4>
                            <p className="text-sm text-gray-600">Large planned expenses (car, travel, home repairs)</p>
                        </div>
                        <button
                            onClick={handleAddExpense}
                            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
                        >
                            + Add
                        </button>
                    </div>

                    {invalidIds.size > 0 && (
                        <div className="mb-3 flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg p-3">
                            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-800">
                                <strong>{invalidIds.size} expense{invalidIds.size > 1 ? 's are' : ' is'} missing a description</strong> and will be ignored. Add a description or remove the row.
                            </p>
                        </div>
                    )}

                    {oneTimeExpenses.length > 0 ? (
                        <div className="space-y-2">
                            {oneTimeExpenses.map((expense) => (
                                <div key={expense.id} className={`flex flex-col sm:flex-row gap-2 sm:items-center p-3 rounded-md ${invalidIds.has(expense.id) ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
                                    <input
                                        ref={el => { descRefs.current[expense.id] = el; }}
                                        type="text"
                                        value={expense.description}
                                        onChange={(e) => handleExpenseChange(expense.id, 'description', e.target.value)}
                                        onBlur={() => setDirtyIds(prev => new Set(prev).add(expense.id))}
                                        placeholder="Description (e.g., 3 weeks in Europe, New car)"
                                        className={`sm:flex-1 px-3 py-2 border rounded-md bg-white focus:ring-2 focus:ring-blue-500 ${invalidIds.has(expense.id) ? 'border-amber-400' : ''}`}
                                        maxLength={100}
                                    />
                                    <div className="flex gap-2 items-center">
                                        <div className="relative flex-1 sm:flex-none sm:w-32">
                                            <span className="absolute left-3 top-2 text-gray-500">$</span>
                                            <input
                                                type="number"
                                                value={expense.amount}
                                                onChange={(e) => handleExpenseChange(expense.id, 'amount', parseFloat(e.target.value) || 0)}
                                                className="w-full pl-7 pr-3 py-2 border rounded-md bg-white text-right focus:ring-2 focus:ring-blue-500"
                                                step="1000"
                                                min="0"
                                            />
                                        </div>
                                        <div className="w-20 sm:w-24">
                                            <input
                                                type="number"
                                                value={expense.age}
                                                onChange={(e) => handleExpenseChange(expense.id, 'age', parseInt(e.target.value) || retirementAge)}
                                                className="w-full px-3 py-2 border rounded-md bg-white text-center focus:ring-2 focus:ring-blue-500"
                                                min={retirementAge}
                                                max={lifeExpectancy}
                                                placeholder="Age"
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleRemoveExpense(expense.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                            title="Remove expense"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 italic">No one-time expenses added yet</p>
                    )}
                </div>
            </div>
        </div>
    );
}
