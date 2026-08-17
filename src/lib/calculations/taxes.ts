// src/lib/calculations/taxes.ts

/**
 * Tax Calculations Module
 * 
 * Implements simplified effective tax rate calculations for retirement planning.
 * 
 * IMPORTANT SIMPLIFICATIONS:
 * - Uses single combined effective rate (not actual tax brackets)
 * - Does not model standard deductions, itemized deductions, or credits
 * - Social Security taxation based on user-specified percentage (not provisional income formula)
 * - Does NOT calculate actual federal/state taxes separately
 * 
 * Key Concepts:
 * - Effective Tax Rate: Average tax rate on all taxable income
 * - Tax Gross-Up: Withdrawing extra to cover taxes on the withdrawal itself
 * - Iterative Convergence: Refining tax calculation until it stabilizes
 */

/**
 * Simplified U.S. tax-rule constants used by the effective-rate model.
 *
 * Figures approximate 2025 federal law and should be reviewed annually. Kept in
 * this module (rather than constants.ts) to avoid a circular import
 * (constants.ts → types → yearlyProjection → taxes).
 *
 * NOT modeled: the OBBBA senior-bonus MAGI phase-out (above $150k MFJ / $75k
 * single — negligible for this tool's typical users), itemized deductions,
 * credits, and the 0%/15%/20% long-term capital-gains brackets.
 */
export const TAX_RULES = {
    // Base standard deduction by filing status — 2026 (IRS Rev. Proc. 2025-32).
    standardDeduction: { single: 16100, married_joint: 32200 },
    // Additional standard deduction per filer/spouse age 65+ — 2026.
    additionalStandardDeduction65: { single: 2050, married_joint: 1650 },
    // OBBBA "senior bonus" deduction: $6,000 per person age 65+, tax years 2025–2028.
    seniorBonusDeduction: 6000,
    seniorBonusLastYear: 2028,
    // Social Security provisional-income thresholds (IRC §86). NOT inflation-indexed
    // (frozen since 1993) — this is what drives the "tax torpedo" over time.
    ssProvisionalThresholds: {
        single: { base: 25000, second: 34000 },
        married_joint: { base: 32000, second: 44000 },
    },
    // Statutory maximum share of SS benefits that can be federally taxable.
    ssMaxTaxableFraction: 0.85,
} as const;

export type FilingStatus = 'single' | 'married_joint';

/**
 * Calculates the federally taxable portion of Social Security via the IRS
 * provisional-income formula (IRC §86 / Pub. 915), rather than a fixed percentage.
 *
 * Provisional income = other AGI items (excluding SS) + ½ of SS benefits.
 * The result is capped at `maxTaxableFraction` (default 85%, the statutory max;
 * a user may lower it to approximate a state SS exemption).
 *
 * @example
 * // $43,200 SS, $19,200 other income, single
 * calculateTaxableSocialSecurity(43200, 19200, 'single');
 * // provisional = 19200 + 21600 = 40800; above $34k → tier-2 formula
 */
export function calculateTaxableSocialSecurity(
    ssBenefit: number,
    otherTaxableIncome: number,
    filingStatus: FilingStatus = 'single',
    maxTaxableFraction: number = TAX_RULES.ssMaxTaxableFraction
): number {
    if (ssBenefit <= 0) return 0;

    const { base, second } = TAX_RULES.ssProvisionalThresholds[filingStatus];
    const provisional = otherTaxableIncome + 0.5 * ssBenefit;

    let taxable: number;
    if (provisional <= base) {
        taxable = 0;
    } else if (provisional <= second) {
        taxable = Math.min(0.5 * ssBenefit, 0.5 * (provisional - base));
    } else {
        const tier1 = Math.min(0.5 * ssBenefit, 0.5 * (second - base));
        taxable = Math.min(0.85 * ssBenefit, 0.85 * (provisional - second) + tier1);
    }

    return Math.min(taxable, maxTaxableFraction * ssBenefit);
}

/**
 * Computes the total standard deduction "tax-free floor" for the year.
 *
 * Includes the base standard deduction, the age-65+ addition, and (for tax years
 * through 2028) the OBBBA senior bonus. The base + age-65 portion is scaled by
 * `inflationFactor` so it keeps pace with the simulation's inflated income; the
 * temporary senior bonus is applied flat.
 *
 * The age-65 addition and senior bonus are counted **per senior**: a single filer
 * contributes one senior once age ≥ 65; for MFJ, pass the spouse's age via
 * `spouseAge` so a second senior is counted once the spouse turns 65. (Pooled-couple
 * simplification — see docs/2-federal-tax-model.md.)
 */
export function calculateStandardDeduction(
    currentAge: number,
    year: number,
    filingStatus: FilingStatus = 'single',
    inflationFactor: number = 1,
    includeSeniorBonus: boolean = true,
    spouseAge?: number
): number {
    const seniors =
        (currentAge >= 65 ? 1 : 0) +
        (filingStatus === 'married_joint' && spouseAge !== undefined && spouseAge >= 65 ? 1 : 0);

    let deduction =
        TAX_RULES.standardDeduction[filingStatus] +
        TAX_RULES.additionalStandardDeduction65[filingStatus] * seniors;

    deduction *= inflationFactor;

    if (includeSeniorBonus && seniors > 0 && year <= TAX_RULES.seniorBonusLastYear) {
        deduction += TAX_RULES.seniorBonusDeduction * seniors;
    }

    return deduction;
}

/**
 * Tax-smart sequencing helper: how much can be pulled from a tax-deferred account
 * this year while keeping total taxable income at or below the standard-deduction
 * floor (i.e. an approximately tax-free draw).
 *
 * This is NOT simply `deduction − otherTaxable`: each extra dollar of tax-deferred
 * income raises provisional income, which can drag up to $0.85 of Social Security
 * into the taxable base (the "tax torpedo"). So the total taxable income as a
 * function of the draw `x` is
 *
 *     total(x) = taxableSS(otherOrdinary + x) + otherOrdinary + x
 *
 * which is monotonically increasing in `x`. We bisect for the largest `x` with
 * `total(x) ≤ deduction`. The caller still caps the result by the spending need and
 * the available balance.
 *
 * @param ssBenefit - Social Security benefit for the year
 * @param otherOrdinaryTaxable - non-SS taxable income already present (pensions,
 *   part-time, rental, brokerage gains, and any RMD already withdrawn)
 * @param ssTaxablePctCap - user cap on the taxable share of SS (≤ statutory 85%)
 * @returns the tax-free tax-deferred draw (0 if the floor is already used up)
 */
export function calculateTaxFreeTaxDeferredRoom(
    ssBenefit: number,
    otherOrdinaryTaxable: number,
    ssTaxablePctCap: number,
    currentAge: number,
    year: number,
    deductionInflationFactor: number = 1,
    filingStatus: FilingStatus = 'single',
    includeSeniorBonus: boolean = true,
    spouseAge?: number
): number {
    const deduction = calculateStandardDeduction(
        currentAge,
        year,
        filingStatus,
        deductionInflationFactor,
        includeSeniorBonus,
        spouseAge
    );

    const totalTaxableAt = (x: number): number =>
        calculateTaxableSocialSecurity(ssBenefit, otherOrdinaryTaxable + x, filingStatus, ssTaxablePctCap) +
        otherOrdinaryTaxable +
        x;

    // Already at/above the floor before any discretionary draw → no tax-free room.
    if (totalTaxableAt(0) >= deduction) return 0;

    // Bisect for the draw that lifts taxable income up to (not over) the floor.
    // Upper bound: x = deduction always overshoots since total(x) ≥ x.
    let lo = 0;
    let hi = deduction;
    for (let i = 0; i < 40 && hi - lo > 1; i++) {
        const mid = (lo + hi) / 2;
        if (totalTaxableAt(mid) <= deduction) {
            lo = mid;
        } else {
            hi = mid;
        }
    }

    return lo;
}

/**
 * Calculates taxes on fixed income sources.
 * 
 * Fixed income includes:
 * - Social Security (taxable percentage specified by user)
 * - Pensions (fully taxable)
 * - Part-time work (fully taxable, payroll tax already deducted)
 * - Rental income (fully taxable)
 * 
 * @param income - Object with all income sources
 * @param effectiveTaxRate - Combined effective tax rate (0 to 0.5)
 * @param socialSecurityTaxablePercentage - Portion of SS that's taxable (0 to 0.85)
 * @returns Tax on fixed income
 * 
 * @example
 * const income = {
 *   socialSecurity: 30000,
 *   pensions: 24000,
 *   partTimeWork: 20000,
 *   rentalIncome: 12000
 * };
 * calculateTaxOnFixedIncome(income, 0.18, 0.50);
 * // Taxable: (30000 * 0.50) + 24000 + 20000 + 12000 = $71,000
 * // Tax: $71,000 * 0.18 = $12,780
 */
export function calculateTaxOnFixedIncome(
    income: {
        socialSecurity: number;
        pensions: number;
        partTimeWork: number;
        rentalIncome: number;
    },
    effectiveTaxRate: number,
    socialSecurityTaxablePercentage: number,
    currentAge: number,
    year: number,
    deductionInflationFactor: number = 1,
    filingStatus: FilingStatus = 'single',
    includeSeniorBonus: boolean = true,
    spouseAge?: number
): number {
    // Taxable Social Security via the provisional-income formula (other fixed income
    // only — withdrawals are added in the final calculation). The user-specified
    // percentage acts as a cap on the statutory 85% maximum.
    const otherIncome = income.pensions + income.partTimeWork + income.rentalIncome;
    const taxableSS = calculateTaxableSocialSecurity(
        income.socialSecurity,
        otherIncome,
        filingStatus,
        socialSecurityTaxablePercentage
    );

    const taxableIncome = taxableSS + otherIncome;

    // Subtract the standard-deduction floor before applying the rate.
    const deduction = calculateStandardDeduction(
        currentAge,
        year,
        filingStatus,
        deductionInflationFactor,
        includeSeniorBonus,
        spouseAge
    );

    return Math.max(0, taxableIncome - deduction) * effectiveTaxRate;
}



/**
 * Calculates total taxes for a year including all sources.
 * 
 * This is the main aggregation function for taxes.
 * 
 * @param income - All income sources
 * @param withdrawals - Withdrawals from each account type
 * @param effectiveTaxRate - Combined effective tax rate
 * @param socialSecurityTaxablePercentage - Taxable portion of SS
 * @param costBasisPercentage - Cost basis for taxable account
 * @param payrollTax - Payroll tax from part-time work (already calculated)
 * @returns Object with tax breakdown
 * 
 * @example
 * const taxes = calculateTotalTaxes(
 *   { socialSecurity: 30000, pensions: 24000, partTimeWork: 20000, rentalIncome: 12000 },
 *   { taxDeferred: 15000, roth: 0, taxable: 5000 },
 *   0.18,
 *   0.50,
 *   0.70,
 *   1533
 * );
 */
export function calculateTotalTaxes(
    income: {
        socialSecurity: number;
        pensions: number;
        partTimeWork: number;
        rentalIncome: number;
    },
    withdrawals: {
        taxDeferred: number;
        roth: number;
        taxable: number;
    },
    effectiveTaxRate: number,
    socialSecurityTaxablePercentage: number,
    costBasisPercentage: number,
    payrollTax: number,
    currentAge: number,
    year: number,
    deductionInflationFactor: number = 1,
    /**
     * Non-medical portion of HSA withdrawals (age 65+). Taxed as ordinary income;
     * medical HSA withdrawals are tax-free and excluded. Defaults to 0.
     */
    hsaNonMedicalWithdrawal: number = 0,
    filingStatus: FilingStatus = 'single',
    includeSeniorBonus: boolean = true,
    spouseAge?: number
): {
    onFixedIncome: number;
    onWithdrawals: number;
    payrollTax: number;
    total: number;
} {
    // Only the GAIN portion of a brokerage withdrawal is income; cost basis is not.
    const brokerageGain = withdrawals.taxable * (1 - costBasisPercentage);

    // Ordinary withdrawal income (tax-deferred + non-medical HSA). Roth is tax-free.
    const ordinaryWithdrawals = withdrawals.taxDeferred + hsaNonMedicalWithdrawal;

    // Taxable Social Security via the provisional formula. "Other income" for the
    // formula includes everything in AGI except SS itself.
    const otherAGIexclSS =
        income.pensions + income.partTimeWork + income.rentalIncome +
        ordinaryWithdrawals + brokerageGain;
    const taxableSS = calculateTaxableSocialSecurity(
        income.socialSecurity,
        otherAGIexclSS,
        filingStatus,
        socialSecurityTaxablePercentage
    );

    // Split the taxable base so the reported fixed-income vs withdrawal tax remains
    // meaningful. The standard deduction is applied to fixed income first, then any
    // leftover shields withdrawal income.
    const fixedBase = taxableSS + income.pensions + income.partTimeWork + income.rentalIncome;
    const withdrawalBase = ordinaryWithdrawals + brokerageGain;

    const deduction = calculateStandardDeduction(
        currentAge,
        year,
        filingStatus,
        deductionInflationFactor,
        includeSeniorBonus,
        spouseAge
    );

    const fixedTaxable = Math.max(0, fixedBase - deduction);
    const deductionLeftover = Math.max(0, deduction - fixedBase);
    const withdrawalTaxable = Math.max(0, withdrawalBase - deductionLeftover);

    const onFixedIncome = fixedTaxable * effectiveTaxRate;
    const onWithdrawals = withdrawalTaxable * effectiveTaxRate;

    return {
        onFixedIncome,
        onWithdrawals,
        payrollTax,
        total: onFixedIncome + onWithdrawals + payrollTax,
    };
}