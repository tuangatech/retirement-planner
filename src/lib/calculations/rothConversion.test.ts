import { describe, it, expect } from 'vitest';
import {
    sizeRothConversion,
    applyRothConversionToBalances,
    getTargetBracketUpperCap,
} from './rothConversion';
import type { RothConversionStrategy } from '@/types';

const plan = (overrides: Partial<RothConversionStrategy> = {}): RothConversionStrategy => ({
    enabled: true,
    startAge: 60,
    endAge: 70,
    strategyType: 'fixed_amount',
    fixedAmount: 20_000,
    targetTaxBracket: 0.12,
    payTaxFromAccount: 'taxable_cash',
    ...overrides,
});

describe('sizeRothConversion', () => {
    it('is 0 when disabled', () => {
        expect(sizeRothConversion(plan({ enabled: false }), 62, 200_000, 0, 'single', 1)).toBe(0);
    });

    it('is 0 outside the age window', () => {
        expect(sizeRothConversion(plan(), 59, 200_000, 0, 'single', 1)).toBe(0);
        expect(sizeRothConversion(plan(), 71, 200_000, 0, 'single', 1)).toBe(0);
    });

    it('converts the fixed amount, capped by the traditional balance', () => {
        expect(sizeRothConversion(plan(), 62, 200_000, 0, 'single', 1)).toBe(20_000);
        expect(sizeRothConversion(plan(), 62, 8_000, 0, 'single', 1)).toBe(8_000);
    });

    it('fills remaining room in the target bracket', () => {
        const fill = plan({ strategyType: 'bracket_fill', targetTaxBracket: 0.12 });
        const cap = getTargetBracketUpperCap('single', 0.12, 1);
        expect(cap).toBe(50_400);
        expect(sizeRothConversion(fill, 62, 200_000, 10_000, 'single', 1)).toBe(40_400);
        expect(sizeRothConversion(fill, 62, 200_000, 50_400, 'single', 1)).toBe(0);
        expect(sizeRothConversion(fill, 62, 5_000, 10_000, 'single', 1)).toBe(5_000);
    });
});

describe('applyRothConversionToBalances', () => {
    const balances = { taxDeferred: 100_000, roth: 50_000, taxable: 40_000, hsa: 0 };

    it('moves the conversion to Roth and pays tax from taxable cash', () => {
        const next = applyRothConversionToBalances(balances, 20_000, 2_400, 'taxable_cash');
        expect(next.taxDeferred).toBe(80_000);
        expect(next.roth).toBe(70_000);
        expect(next.taxable).toBe(37_600);
    });

    it('withholds tax from conversion proceeds', () => {
        const next = applyRothConversionToBalances(balances, 20_000, 2_400, 'conversion_proceeds');
        expect(next.taxDeferred).toBe(80_000);
        expect(next.roth).toBe(67_600);
        expect(next.taxable).toBe(40_000);
    });

    it('withholds leftover tax from Roth when taxable cash is short', () => {
        const tight = { ...balances, taxable: 500 };
        const next = applyRothConversionToBalances(tight, 20_000, 2_400, 'taxable_cash');
        expect(next.taxable).toBe(0);
        expect(next.roth).toBe(50_000 + 20_000 - 1_900);
    });
});
