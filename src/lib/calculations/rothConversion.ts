// src/lib/calculations/rothConversion.ts
//
// Sizes and applies an annual Roth conversion. The yearly projection loop calls
// this *after* spending withdrawals (including RMDs and tax-smart fills) so only
// leftover tax-deferred money is converted — an RMD cannot be converted.

import type { RothConversionStrategy } from '@/types';
import type { FilingStatus } from './taxes';
import type { AccountBalances } from './withdrawals';

/**
 * 2026 ordinary-income bracket *upper caps* (taxable income, after the standard
 * deduction). Same Tax Foundation / IRS Rev. Proc. 2025-32 figures as
 * `compareStatesTax.ts`. The cap of the 24% bracket is the start of the 32%
 * bracket, and so on. Review annually.
 */
export const FEDERAL_BRACKET_UPPER_CAPS_2026: Record<
    FilingStatus,
    Array<{ rate: number; cap: number }>
> = {
    single: [
        { rate: 0.10, cap: 12400 },
        { rate: 0.12, cap: 50400 },
        { rate: 0.22, cap: 105700 },
        { rate: 0.24, cap: 201775 },
        { rate: 0.32, cap: 256225 },
        { rate: 0.35, cap: 640600 },
        { rate: 0.37, cap: Number.POSITIVE_INFINITY },
    ],
    married_joint: [
        { rate: 0.10, cap: 24800 },
        { rate: 0.12, cap: 100800 },
        { rate: 0.22, cap: 211400 },
        { rate: 0.24, cap: 403550 },
        { rate: 0.32, cap: 512450 },
        { rate: 0.35, cap: 768700 },
        { rate: 0.37, cap: Number.POSITIVE_INFINITY },
    ],
};

export const ROTH_CONVERSION_BRACKET_OPTIONS = [0.10, 0.12, 0.22, 0.24, 0.32] as const;

/** Upper cap of `targetRate` (inflated with the deduction so it keeps pace). */
export function getTargetBracketUpperCap(
    filingStatus: FilingStatus,
    targetRate: number,
    inflationFactor: number = 1
): number {
    const brackets = FEDERAL_BRACKET_UPPER_CAPS_2026[filingStatus];
    const match = brackets.find((b) => Math.abs(b.rate - targetRate) < 1e-9) ?? brackets[1];
    if (!Number.isFinite(match.cap)) return Number.POSITIVE_INFINITY;
    return match.cap * inflationFactor;
}

/**
 * How much tax-deferred money to convert this year. 0 if the plan is off, the
 * age is outside the window, or there is no remaining traditional balance.
 */
export function sizeRothConversion(
    strategy: RothConversionStrategy,
    currentAge: number,
    traditionalBalance: number,
    currentTaxableIncome: number,
    filingStatus: FilingStatus,
    inflationFactor: number
): number {
    if (!strategy.enabled) return 0;
    if (currentAge < strategy.startAge || currentAge > strategy.endAge) return 0;

    const available = Math.max(0, traditionalBalance);
    if (available <= 0) return 0;

    if (strategy.strategyType === 'fixed_amount') {
        return Math.min(available, Math.max(0, strategy.fixedAmount ?? 0));
    }

    const cap = getTargetBracketUpperCap(
        filingStatus,
        strategy.targetTaxBracket ?? 0.12,
        inflationFactor
    );
    const remainingRoom = Number.isFinite(cap) ? cap - currentTaxableIncome : available;
    return Math.min(available, Math.max(0, remainingRoom));
}

/**
 * Move `conversionAmount` from tax-deferred to Roth and pay `taxDelta` from
 * taxable cash and/or the conversion proceeds. Never drives a balance negative;
 * leftover tax that taxable cannot cover is withheld from the Roth deposit.
 */
export function applyRothConversionToBalances(
    balances: AccountBalances,
    conversionAmount: number,
    taxDelta: number,
    payTaxFromAccount: RothConversionStrategy['payTaxFromAccount']
): AccountBalances {
    const next = { ...balances };
    if (conversionAmount <= 0) return next;

    next.taxDeferred = Math.max(0, next.taxDeferred - conversionAmount);

    const tax = Math.max(0, taxDelta);
    let taxFromTaxable = 0;
    let taxFromProceeds = 0;

    if (payTaxFromAccount === 'taxable_cash') {
        taxFromTaxable = Math.min(tax, next.taxable);
        taxFromProceeds = tax - taxFromTaxable;
    } else {
        taxFromProceeds = Math.min(tax, conversionAmount);
        taxFromTaxable = Math.min(tax - taxFromProceeds, next.taxable);
    }

    next.taxable = Math.max(0, next.taxable - taxFromTaxable);
    next.roth = Math.max(0, next.roth + conversionAmount - taxFromProceeds);
    return next;
}
