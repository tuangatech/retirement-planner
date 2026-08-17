// src/lib/calculations/yearlyProjection.ts

import type { UserInputs } from '@/types';
import { determinePhase, calculateYearlyExpenses } from '@/lib/calculations/expenses';
import { calculateYearlyIncome } from '@/lib/calculations/income';
import { calculateTotalTaxes, calculateTaxOnFixedIncome } from '@/lib/calculations/taxes';
import {
    executeWithdrawals,
    handleSurplus,
    calculateTotalPortfolio,
    isPortfolioDepleted,
    type AccountBalances,
} from '@/lib/calculations/withdrawals';
import { generateAccountReturns } from '@/lib/calculations/random';
import { RMD_START_AGE } from '@/lib/calculations/rmd';
import { computeStateTax, type StateTaxInputs } from '@/lib/calculations/stateTax';
import { getStateTaxRules } from '@/lib/calculations/stateTaxRules';

export interface YearlyProjection {
    age: number;
    year: number;
    phase: 'working' | 'go_go' | 'slow_go' | 'no_go';

    income: {
        socialSecurity: number;
        socialSecurityFull: number;
        socialSecurityReduction: number;
        pensions: number;
        partTimeWork: number;
        rentalIncome: number;
        totalBeforeWithdrawals: number;
    };

    expenses: {
        living: number;
        healthcarePremiums: number;
        healthcareOutOfPocket: number;
        oneTimeExpenses: number;
        total: number;
    };

    taxes: {
        onFixedIncome: number;
        onWithdrawals: number;
        payrollTax: number;
        /**
         * State income tax, kept separate from the federal figures for transparency in the
         * Annual Breakdown. Always 0 for states we don't model — in that case the user's
         * marginal rate is carrying the state burden instead (docs/5-state-tax-model.md).
         */
        stateTax: number;
        total: number;
    };

    portfolio: {
        contributions: number;
        withdrawals: {
            taxDeferred: number;
            roth: number;
            taxable: number;
            hsa: number;
            total: number;
        };
        rmdAmount: number;
        rmdExcess: number;
        hsaForHealthcare: number;  // Tax-free healthcare coverage
        investmentReturns: {
            taxDeferred: number;
            roth: number;
            taxable: number;
            hsa: number;
            total: number;
        };
        balances: AccountBalances & { total: number };
    };

    netCashFlow: number;
    shortfall: number;
    portfolioDepleted: boolean;
}

export function calculateYearlyProjection(
    currentAge: number,
    year: number,
    currentBalances: AccountBalances,
    inputs: UserInputs,
    rng: () => number
): YearlyProjection {
    const { personal, phases, accounts, income, healthcare, tax, simulation } = inputs;

    // STEP 1: Determine phase
    const phase = determinePhase(currentAge, phases);

    // Filing status + MFJ spouse context, needed by both the income and tax steps.
    // The standard-deduction floor is scaled by the same inflation that grows income
    // (deductions are inflation-indexed in reality); the SS provisional thresholds
    // inside the tax module stay frozen (the "tax torpedo").
    const filingStatus = personal.filingStatus ?? 'single';
    const deductionInflationFactor = Math.pow(
        1 + simulation.generalInflationRate,
        Math.max(0, currentAge - personal.retirementAge)
    );
    // MFJ: the spouse's age this year, derived from their age at the primary's
    // retirement (the loop is driven by the primary's age). Undefined for single.
    const spouseAge =
        filingStatus === 'married_joint' && personal.spouseAgeAtRetirement !== undefined
            ? personal.spouseAgeAtRetirement + (currentAge - personal.retirementAge)
            : undefined;
    // Pooled accounts → one household RMD keyed to the OLDER spouse's age, beginning at
    // the flat RMD_START_AGE (75; see rmd.ts). The older spouse drives the trigger so the
    // pooled balance starts distributing no later than required.
    const rmdAge = spouseAge !== undefined ? Math.max(currentAge, spouseAge) : currentAge;

    // STEP 2: Calculate income
    const incomeResult = calculateYearlyIncome(
        currentAge,
        income.socialSecurity,
        income.pensions,
        income.partTimeWork,
        income.rentalIncome,
        simulation.generalInflationRate,
        income.spouseSocialSecurity,
        spouseAge
    );

    // STEP 3: Calculate expenses
    const expensesResult = calculateYearlyExpenses(
        currentAge,
        personal.retirementAge,
        phases,
        inputs.oneTimeExpenses,
        healthcare.preMedicare,
        healthcare.medicare,
        simulation.generalInflationRate,
        simulation.healthcareInflationRate,
        spouseAge
    );

    // STEP 4: Calculate initial taxes on fixed income
    const initialTaxOnIncome = calculateTaxOnFixedIncome(
        {
            socialSecurity: incomeResult.socialSecurity,
            pensions: incomeResult.pensions,
            partTimeWork: incomeResult.partTimeWork,
            rentalIncome: incomeResult.rentalIncome,
        },
        tax.combinedEffectiveRate,
        income.socialSecurity.taxablePercentage,
        currentAge,
        year,
        deductionInflationFactor,
        filingStatus,
        true,
        spouseAge
    );

    // State tax is only computed when the user opted in (or a new scenario defaulted in);
    // 'manual' means their marginal rate already includes state points, so computing it here
    // would tax them twice. A missing value is legacy and means 'manual'.
    const stateRules =
        (tax.stateTaxMode ?? 'manual') === 'modeled' ? getStateTaxRules(personal.state) : undefined;

    // Federal-AGI components for the state calculation, Social Security excluded because every
    // modeled state exempts it. Withdrawals are zero at this point — this pass sizes the
    // cash-flow gap, and the final pass below sees the real draws.
    const stateInputsBase: StateTaxInputs = {
        year,
        filingStatus,
        age: currentAge,
        spouseAge,
        governmentPensionIncome: incomeResult.governmentPensionIncome,
        privatePensionIncome: incomeResult.pensions - incomeResult.governmentPensionIncome,
        partTimeWork: incomeResult.partTimeWork,
        rentalIncome: incomeResult.rentalIncome,
        taxDeferredWithdrawals: 0,
        brokerageGains: 0,
        hsaNonMedicalWithdrawals: 0,
    };

    // STEP 5: Determine cash flow gap — state tax belongs here, not only in the final
    // reckoning, or the year under-withdraws by exactly the state tax owed.
    const initialStateTax = computeStateTax(stateRules, stateInputsBase).tax;
    const totalFixedIncome = incomeResult.totalBeforeWithdrawals;
    const totalExpenses = expensesResult.total;
    const initialTotalTax =
        initialTaxOnIncome + incomeResult.partTimePayrollTax + initialStateTax;
    const cashFlowGap = totalExpenses + initialTotalTax - totalFixedIncome;

    // Initialize withdrawal and portfolio tracking
    let withdrawalResult;
    let updatedBalances = { ...currentBalances };
    let portfolioIsDepleted = false;

    // STEP 6: Execute withdrawals (HSA-aware)
    if (cashFlowGap > 0) {
        withdrawalResult = executeWithdrawals(
            currentAge,
            cashFlowGap,
            currentBalances,
            expensesResult.healthcarePremiums + expensesResult.healthcareOutOfPocket,  // total healthcare cost
            accounts.hsa.allowNonMedicalAfter65,  // HSA non-medical withdrawal policy
            inputs.withdrawalStrategy.priorityOrder,
            {
                socialSecurity: incomeResult.socialSecurity,
                pensions: incomeResult.pensions,
                partTimeWork: incomeResult.partTimeWork,
                rentalIncome: incomeResult.rentalIncome,
            },
            tax.combinedEffectiveRate,
            income.socialSecurity.taxablePercentage,
            accounts.taxable.costBasisPercentage || 0.70,
            // Tax-smart sequencing (fill the deduction floor from tax-deferred first).
            // Default to 'tax_smart' when the field is absent (e.g. older code paths);
            // the storage loader keeps legacy saved scenarios on 'standard'.
            inputs.withdrawalStrategy.strategy ?? 'tax_smart',
            year,
            deductionInflationFactor,
            filingStatus,
            spouseAge,
            rmdAge,
            RMD_START_AGE,
            // Gross up withdrawals for state tax using the state's own formula, evaluated at
            // whatever the solver is currently testing. Not a single probed rate: a state's
            // marginal rate is not constant across a draw (Virginia's age deduction phases out
            // dollar-for-dollar, doubling the rate to ~11.5% inside a $12,000-wide band and
            // halving it again above), so any one rate is wrong for part of any draw that
            // crosses the kink.
            //
            // Broken out by type — tax-deferred, brokerage gains, non-medical HSA — rather than
            // one pooled figure, because a benefit scoped to a specific income type (New York's
            // pension/IRA exclusion excludes gains and HSA income; Georgia's excludes only HSA
            // income) must not be sized against income it will not actually shelter at
            // settlement. Sizing a pooled "ordinary income" figure against New York's $20,000
            // exclusion used to over-grant it to gains realized in the same year — the exclusion
            // saturated during the solve on phantom room that real settlement never had, because
            // settlement bounds it by the *real* tax-deferred amount, not by whatever the solve
            // happened to lump in with it. The final `computeStateTax` below uses these same
            // fields, so solve and settlement now agree by construction.
            (breakdown) =>
                computeStateTax(stateRules, {
                    ...stateInputsBase,
                    taxDeferredWithdrawals: breakdown.taxDeferred,
                    brokerageGains: breakdown.brokerageGains,
                    hsaNonMedicalWithdrawals: breakdown.hsaNonMedical,
                }).tax - initialStateTax
        );

        // Deduct withdrawals from current balances
        updatedBalances.taxDeferred = currentBalances.taxDeferred - withdrawalResult.withdrawals.taxDeferred;
        updatedBalances.roth = currentBalances.roth - withdrawalResult.withdrawals.roth;
        updatedBalances.taxable = currentBalances.taxable - withdrawalResult.withdrawals.taxable;
        updatedBalances.hsa = currentBalances.hsa - withdrawalResult.withdrawals.hsa;

        portfolioIsDepleted = isPortfolioDepleted(updatedBalances);
    } else {
        // Surplus case: income > expenses
        const surplus = Math.abs(cashFlowGap);
        updatedBalances = handleSurplus(surplus, currentBalances);

        withdrawalResult = {
            withdrawals: { taxDeferred: 0, roth: 0, taxable: 0, hsa: 0 },
            taxOnWithdrawals: 0,
            updatedBalances,
            rmdAmount: 0,
            rmdExcess: surplus,
            hsaForHealthcare: 0,
            iterations: 1,
            converged: true,
            shortfall: 0,
        };
    }

    // HSA: only the non-medical portion (age 65+) is taxable ordinary income;
    // medical withdrawals are always tax-free. Passed to the tax model so it's
    // taxed consistently (and shielded by the deduction floor like other income).
    const hsaNonMedicalWithdrawal = Math.max(
        0,
        withdrawalResult.withdrawals.hsa - withdrawalResult.hsaForHealthcare
    );

    // Calculate final taxes (provisional-income SS + standard-deduction floor).
    const finalTaxes = calculateTotalTaxes(
        {
            socialSecurity: incomeResult.socialSecurity,
            pensions: incomeResult.pensions,
            partTimeWork: incomeResult.partTimeWork,
            rentalIncome: incomeResult.rentalIncome,
        },
        withdrawalResult.withdrawals,
        tax.combinedEffectiveRate,
        income.socialSecurity.taxablePercentage,
        accounts.taxable.costBasisPercentage || 0.70,
        incomeResult.partTimePayrollTax,
        currentAge,
        year,
        deductionInflationFactor,
        hsaNonMedicalWithdrawal,
        filingStatus,
        true,
        spouseAge
    );

    // State income tax on the year's full picture, now that withdrawals are known.
    const stateTax = computeStateTax(stateRules, {
        ...stateInputsBase,
        taxDeferredWithdrawals: withdrawalResult.withdrawals.taxDeferred,
        brokerageGains:
            withdrawalResult.withdrawals.taxable * (1 - (accounts.taxable.costBasisPercentage || 0.70)),
        hsaNonMedicalWithdrawals: hsaNonMedicalWithdrawal,
    }).tax;

    const totalTax = finalTaxes.total + stateTax;

    // Total withdrawals and net cash flow — computed here (before returns) so any
    // surplus can be reinvested and then compounded this year.
    const totalWithdrawals =
        withdrawalResult.withdrawals.taxDeferred +
        withdrawalResult.withdrawals.roth +
        withdrawalResult.withdrawals.taxable +
        withdrawalResult.withdrawals.hsa;

    const netCashFlow =
        incomeResult.totalBeforeWithdrawals +
        totalWithdrawals -
        expensesResult.total -
        totalTax;

    // Reinvest surplus from the withdrawal branch into the taxable account. This
    // covers both forced-RMD excess and the small over-withdrawal that arises
    // because the withdrawal engine's gross-up ignores the deduction floor. Without
    // this, that cash would leak out and understate the final balance. (The surplus
    // branch above already reinvests via handleSurplus, so only the withdrawal
    // branch needs it here.)
    if (cashFlowGap > 0 && netCashFlow > 0) {
        updatedBalances.taxable += netCashFlow;
    }

    // STEP 7: Apply investment returns (including HSA)
    const returns = generateAccountReturns(
        {
            taxDeferred: accounts.taxDeferred.expectedReturnRate,
            roth: accounts.roth.expectedReturnRate,
            taxable: accounts.taxable.expectedReturnRate,
            hsa: accounts.hsa.expectedReturnRate,
        },
        simulation.returnStdDeviation,
        rng
    );

    // Calculate dollar returns
    const investmentReturns = {
        taxDeferred: updatedBalances.taxDeferred * returns.taxDeferred,
        roth: updatedBalances.roth * returns.roth,
        taxable: updatedBalances.taxable * returns.taxable,
        hsa: updatedBalances.hsa * returns.hsa,
        total: 0,
    };
    investmentReturns.total =
        investmentReturns.taxDeferred +
        investmentReturns.roth +
        investmentReturns.taxable +
        investmentReturns.hsa;

    // Apply returns to balances
    updatedBalances.taxDeferred += investmentReturns.taxDeferred;
    updatedBalances.roth += investmentReturns.roth;
    updatedBalances.taxable += investmentReturns.taxable;
    updatedBalances.hsa += investmentReturns.hsa;

    const totalContributions = 0;

    // Ensure balances don't go negative
    updatedBalances.taxDeferred = Math.max(0, updatedBalances.taxDeferred);
    updatedBalances.roth = Math.max(0, updatedBalances.roth);
    updatedBalances.taxable = Math.max(0, updatedBalances.taxable);
    updatedBalances.hsa = Math.max(0, updatedBalances.hsa);

    // STEP 8: Assemble complete projection
    return {
        age: currentAge,
        year,
        phase,

        income: {
            socialSecurity: incomeResult.socialSecurity,
            socialSecurityFull: incomeResult.socialSecurityFull,
            socialSecurityReduction: incomeResult.socialSecurityReduction,
            pensions: incomeResult.pensions,
            partTimeWork: incomeResult.partTimeWork,
            rentalIncome: incomeResult.rentalIncome,
            totalBeforeWithdrawals: incomeResult.totalBeforeWithdrawals,
        },

        expenses: {
            living: expensesResult.living,
            healthcarePremiums: expensesResult.healthcarePremiums,
            healthcareOutOfPocket: expensesResult.healthcareOutOfPocket,
            oneTimeExpenses: expensesResult.oneTimeExpenses,
            total: expensesResult.total,
        },

        taxes: {
            onFixedIncome: finalTaxes.onFixedIncome,
            onWithdrawals: finalTaxes.onWithdrawals,
            payrollTax: finalTaxes.payrollTax,
            stateTax,
            total: totalTax,
        },

        portfolio: {
            contributions: totalContributions,
            withdrawals: {
                taxDeferred: withdrawalResult.withdrawals.taxDeferred,
                roth: withdrawalResult.withdrawals.roth,
                taxable: withdrawalResult.withdrawals.taxable,
                hsa: withdrawalResult.withdrawals.hsa,
                total: totalWithdrawals,
            },
            rmdAmount: withdrawalResult.rmdAmount,
            rmdExcess: withdrawalResult.rmdExcess,
            hsaForHealthcare: withdrawalResult.hsaForHealthcare,
            investmentReturns,
            balances: {
                taxDeferred: updatedBalances.taxDeferred,
                roth: updatedBalances.roth,
                taxable: updatedBalances.taxable,
                hsa: updatedBalances.hsa,
                total: calculateTotalPortfolio(updatedBalances),
            },
        },

        netCashFlow,
        shortfall: withdrawalResult.shortfall,
        portfolioDepleted: portfolioIsDepleted,
    };
}

/**
 * Runs ONLY from retirement age to life expectancy (with HSA).
 */
export function runCompleteSimulation(
    inputs: UserInputs,
    rng: () => number
): {
    success: boolean;
    ageOfDepletion: number | null;
    finalBalance: number;
    projections: YearlyProjection[];
} {
    const { personal, accounts } = inputs;
    const projections: YearlyProjection[] = [];

    // Initialize balances including HSA
    let currentBalances: AccountBalances = {
        taxDeferred: accounts.taxDeferred.balanceAtRetirement,
        roth: accounts.roth.balanceAtRetirement,
        taxable: accounts.taxable.balanceAtRetirement,
        hsa: accounts.hsa.balanceAtRetirement,
    };

    let ageOfDepletion: number | null = null;

    // Simulate ONLY retirement years
    for (let age = personal.retirementAge; age <= personal.lifeExpectancy; age++) {
        const year = 2026 + (age - personal.retirementAge);

        const projection = calculateYearlyProjection(
            age,
            year,
            currentBalances,
            inputs,
            rng
        );

        projections.push(projection);

        // Update balances for next year
        currentBalances = {
            taxDeferred: projection.portfolio.balances.taxDeferred,
            roth: projection.portfolio.balances.roth,
            taxable: projection.portfolio.balances.taxable,
            hsa: projection.portfolio.balances.hsa,
        };

        // Check for portfolio depletion
        if (projection.portfolioDepleted && ageOfDepletion === null) {
            ageOfDepletion = age;
        }
    }

    // Success means the portfolio funded all spending through life expectancy —
    // i.e., it never hit the depletion threshold (isPortfolioDepleted, < $100).
    // NOTE: do NOT use `finalBalance > 0`. Depleted runs can strand a few dollars
    // (the withdrawal engine ignores balances under $10, and reinvested-surplus
    // pennies compound), which would otherwise miscount a failed run — one that
    // depleted mid-retirement with years of unmet spending — as a "success" and
    // pollute the percentile distribution (the "$9 median" artifact).
    const success = ageOfDepletion === null;

    // Report depleted runs as $0 so failed outcomes don't display stranded pennies.
    const finalBalance = success ? calculateTotalPortfolio(currentBalances) : 0;

    return {
        success,
        ageOfDepletion,
        finalBalance,
        projections,
    };
}

