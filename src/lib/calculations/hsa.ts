// src/lib/calculations/hsa.ts

/**
 * HSA (Health Savings Account) Calculations Module
 * 
 * HSA has unique tax treatment that changes at age 65:
 * 
 * BEFORE AGE 65:
 * - Withdrawals for qualified medical expenses: TAX-FREE
 * - Withdrawals for non-medical: Taxed + 20% penalty (not modeled - we don't do this)
 * 
 * AFTER AGE 65:
 * - Withdrawals for medical expenses: Still TAX-FREE
 * - Withdrawals for non-medical: Taxed as ordinary income (no penalty)
 * - Essentially becomes like a Traditional IRA
 * 
 * STRATEGY:
 * - Always use HSA for healthcare first (tax-free regardless of age)
 * - After 65, if HSA > healthcare needs, can use excess for general expenses (taxed)
 */

export const HSA_AGE_THRESHOLD = 65;

export interface HSAWithdrawalResult {
    medicalWithdrawal: number;      // Tax-free portion (for healthcare)
    nonMedicalWithdrawal: number;   // Taxed portion (age 65+ only)
    taxOnNonMedical: number;        // Tax on non-medical withdrawal
    totalWithdrawal: number;        // Total HSA withdrawal
    remainingBalance: number;       // HSA balance after withdrawal
    healthcareCovered: number;      // Amount of healthcare costs covered
}

/**
 * Calculates optimal HSA withdrawal for a given year.
 * 
 * LOGIC:
 * 1. Use HSA to cover healthcare costs first (tax-free)
 * 2. If age >= 65 and HSA has excess and general cash flow gap exists:
 *    - Use remaining HSA for general expenses (taxed as ordinary income)
 * 
 * @param currentAge - Person's current age
 * @param hsaBalance - Current HSA balance
 * @param healthcareCosts - Total healthcare costs for the year
 * @param generalCashFlowGap - Additional cash needed beyond healthcare (optional)
 * @param allowNonMedicalAfter65 - Whether to allow general withdrawals after 65
 * @param effectiveTaxRate - Effective tax rate for non-medical withdrawals
 * @returns HSA withdrawal breakdown
 */
export function calculateHSAWithdrawal(
    currentAge: number,
    hsaBalance: number,
    healthcareCosts: number,
    generalCashFlowGap: number = 0,
    allowNonMedicalAfter65: boolean = false,
    effectiveTaxRate: number = 0.18
): HSAWithdrawalResult {
    // No HSA balance - return zeros
    if (hsaBalance <= 0) {
        return {
            medicalWithdrawal: 0,
            nonMedicalWithdrawal: 0,
            taxOnNonMedical: 0,
            totalWithdrawal: 0,
            remainingBalance: 0,
            healthcareCovered: 0,
        };
    }

    let medicalWithdrawal = 0;
    let nonMedicalWithdrawal = 0;
    let taxOnNonMedical = 0;

    // STEP 1: Cover healthcare costs (tax-free, any age)
    if (healthcareCosts > 0) {
        medicalWithdrawal = Math.min(healthcareCosts, hsaBalance);
    }

    const remainingHSA = hsaBalance - medicalWithdrawal;

    // STEP 2: If age >= 65 and HSA has excess, use for general expenses (taxed)
    if (
        currentAge >= HSA_AGE_THRESHOLD &&
        allowNonMedicalAfter65 &&
        remainingHSA > 0 &&
        generalCashFlowGap > 0
    ) {
        // Calculate gross withdrawal needed to net the cash flow gap
        // Formula: gross = net / (1 - tax_rate)
        const grossNeeded = generalCashFlowGap / (1 - effectiveTaxRate);

        // Limited by remaining HSA balance
        const actualGross = Math.min(grossNeeded, remainingHSA);

        nonMedicalWithdrawal = actualGross;
        taxOnNonMedical = actualGross * effectiveTaxRate;
    }

    const totalWithdrawal = medicalWithdrawal + nonMedicalWithdrawal;
    const finalBalance = hsaBalance - totalWithdrawal;

    return {
        medicalWithdrawal,
        nonMedicalWithdrawal,
        taxOnNonMedical,
        totalWithdrawal,
        remainingBalance: Math.max(0, finalBalance),
        healthcareCovered: medicalWithdrawal,
    };
}

/**
 * Determines if HSA can be used for non-medical expenses based on age.
 * 
 * @param currentAge - Person's current age
 * @returns True if age >= 65, false otherwise
 */
export function canUseHSAForNonMedical(currentAge: number): boolean {
    return currentAge >= HSA_AGE_THRESHOLD;
}

/**
 * Calculates the net benefit (after-tax value) of an HSA withdrawal.
 * 
 * @param withdrawal - Gross HSA withdrawal amount
 * @param currentAge - Person's current age
 * @param isForHealthcare - Whether withdrawal is for qualified medical expenses
 * @param effectiveTaxRate - Effective tax rate
 * @returns Net after-tax value of withdrawal
 */
export function calculateHSANetValue(
    withdrawal: number,
    currentAge: number,
    isForHealthcare: boolean,
    effectiveTaxRate: number = 0.18
): number {
    // Healthcare withdrawals are always tax-free
    if (isForHealthcare) {
        return withdrawal;
    }

    // Non-medical withdrawals before 65 incur 20% penalty + tax (not modeled - shouldn't happen)
    if (currentAge < HSA_AGE_THRESHOLD) {
        // In practice, we don't allow this in the simulator
        return withdrawal * (1 - effectiveTaxRate - 0.20);
    }

    // Non-medical withdrawals after 65 are just taxed (no penalty)
    return withdrawal * (1 - effectiveTaxRate);
}

/**
 * Validates HSA withdrawal inputs.
 * 
 * @param currentAge - Person's current age
 * @param hsaBalance - Current HSA balance
 * @param healthcareCosts - Healthcare costs for the year
 * @returns Validation result
 */
export function validateHSAInputs(
    currentAge: number,
    hsaBalance: number,
    healthcareCosts: number
): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Number.isFinite(currentAge) || currentAge < 0) {
        errors.push('Invalid age');
    }

    if (!Number.isFinite(hsaBalance) || hsaBalance < 0) {
        errors.push('HSA balance cannot be negative');
    }

    if (!Number.isFinite(healthcareCosts) || healthcareCosts < 0) {
        errors.push('Healthcare costs cannot be negative');
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Estimates years of healthcare coverage provided by HSA.
 * 
 * This is a planning helper function.
 * 
 * @param hsaBalance - Current HSA balance
 * @param annualHealthcareCost - Estimated annual healthcare cost
 * @returns Estimated years of coverage
 */
export function estimateHSACoverageYears(
    hsaBalance: number,
    annualHealthcareCost: number
): number {
    if (annualHealthcareCost <= 0) return 0;
    return hsaBalance / annualHealthcareCost;
}