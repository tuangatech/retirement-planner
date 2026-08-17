// src/lib/insights.test.ts

import { describe, it, expect } from 'vitest';
import { generateInsights } from './insights';
import { DEFAULT_VALUES } from './constants';
import type { UserInputs } from '@/types';
import type { YearlyProjection } from '@/lib/calculations/yearlyProjection';

/** Deep-ish clone of the defaults with per-test overrides — same pattern as yearlyProjection.test.ts. */
function makeInputs(overrides: Partial<UserInputs> = {}): UserInputs {
    return structuredClone({ ...DEFAULT_VALUES, ...overrides });
}

/**
 * A minimal, zeroed YearlyProjection with just the fields `generateInsights` actually reads
 * filled in via `overrides`. Building full realistic projections via `runCompleteSimulation`
 * for every branch would make each test depend on emergent simulation behavior instead of the
 * rule being tested — this keeps each case a direct, targeted input to the pure function.
 */
function proj(
    age: number,
    overrides: {
        socialSecurity?: number;
        socialSecurityReduction?: number;
        partTimeWork?: number;
        healthcarePremiums?: number;
        healthcareOutOfPocket?: number;
        oneTimeExpenses?: number;
        withdrawalsTotal?: number;
        rmdAmount?: number;
        onWithdrawals?: number;
        hsaBalance?: number;
        portfolioBalance?: number;
    } = {}
): YearlyProjection {
    return {
        age,
        year: 2026,
        phase: 'go_go',
        income: {
            socialSecurity: overrides.socialSecurity ?? 0,
            socialSecurityFull: overrides.socialSecurity ?? 0,
            socialSecurityReduction: overrides.socialSecurityReduction ?? 0,
            pensions: 0,
            partTimeWork: overrides.partTimeWork ?? 0,
            rentalIncome: 0,
            totalBeforeWithdrawals: overrides.socialSecurity ?? 0,
        },
        expenses: {
            living: 0,
            healthcarePremiums: overrides.healthcarePremiums ?? 0,
            healthcareOutOfPocket: overrides.healthcareOutOfPocket ?? 0,
            oneTimeExpenses: overrides.oneTimeExpenses ?? 0,
            total: 0,
        },
        taxes: {
            onFixedIncome: 0,
            onWithdrawals: overrides.onWithdrawals ?? 0,
            payrollTax: 0,
            stateTax: 0,
            total: 0,
        },
        portfolio: {
            contributions: 0,
            withdrawals: { taxDeferred: 0, roth: 0, taxable: 0, hsa: 0, total: overrides.withdrawalsTotal ?? 0 },
            rmdAmount: overrides.rmdAmount ?? 0,
            rmdExcess: 0,
            hsaForHealthcare: 0,
            investmentReturns: { taxDeferred: 0, roth: 0, taxable: 0, hsa: 0, total: 0 },
            balances: {
                taxDeferred: 0,
                roth: 0,
                taxable: 0,
                hsa: overrides.hsaBalance ?? 0,
                total: overrides.portfolioBalance ?? 0,
            },
        },
        netCashFlow: 0,
        shortfall: 0,
        portfolioDepleted: false,
    };
}

describe('generateInsights — edge cases', () => {
    it('returns no insights for an empty projection list', () => {
        expect(generateInsights([], makeInputs())).toEqual([]);
    });
});

describe('generateInsights — zero-withdrawal gap', () => {
    it('flags a gap of years with no withdrawals before the first real draw', () => {
        const inputs = makeInputs();
        inputs.personal.retirementAge = 65;
        const projections = [
            proj(65, { withdrawalsTotal: 0 }),
            proj(66, { withdrawalsTotal: 0 }),
            proj(67, { withdrawalsTotal: 5000 }),
        ];

        const insights = generateInsights(projections, inputs);
        const insight = insights.find(i => i.title === 'No withdrawals needed in early retirement!');
        expect(insight).toBeDefined();
        expect(insight).toMatchObject({ type: 'positive', icon: 'alert-circle', ageRange: 'Ages 65-66' });
        expect(insight!.description).toContain('first 2 years');
    });

    it('does not fire when the very first year already withdraws', () => {
        const inputs = makeInputs();
        const projections = [proj(65, { withdrawalsTotal: 5000 }), proj(66, { withdrawalsTotal: 5000 })];
        const insights = generateInsights(projections, inputs);
        expect(insights.find(i => i.title === 'No withdrawals needed in early retirement!')).toBeUndefined();
    });

    it('does not fire when withdrawals never exceed the noise threshold', () => {
        const inputs = makeInputs();
        const projections = [proj(65, { withdrawalsTotal: 0 }), proj(66, { withdrawalsTotal: 0 })];
        const insights = generateInsights(projections, inputs);
        expect(insights.find(i => i.title === 'No withdrawals needed in early retirement!')).toBeUndefined();
    });
});

describe('generateInsights — Medicare transition at 65', () => {
    it('flags a healthcare cost drop as Medicare eligibility begins (info)', () => {
        const inputs = makeInputs();
        const projections = [
            proj(64, { healthcarePremiums: 1500, healthcareOutOfPocket: 0 }),
            proj(65, { healthcarePremiums: 200, healthcareOutOfPocket: 0 }),
            proj(66, {}),
        ];
        const insights = generateInsights(projections, inputs);
        const insight = insights.find(i => i.title === 'Medicare eligibility begins');
        expect(insight).toMatchObject({ type: 'info', icon: 'calendar', ageRange: 'Age 65' });
    });

    it('flags a healthcare cost rise as beginning with higher costs (warning)', () => {
        const inputs = makeInputs();
        const projections = [
            proj(64, { healthcarePremiums: 200, healthcareOutOfPocket: 0 }),
            proj(65, { healthcarePremiums: 1500, healthcareOutOfPocket: 0 }),
            proj(66, {}),
        ];
        const insights = generateInsights(projections, inputs);
        const insight = insights.find(i => i.title === 'Medicare begins with higher costs');
        expect(insight).toMatchObject({ type: 'warning', icon: 'alert-circle', ageRange: 'Age 65' });
    });

    it('does not fire when age 65 is the first or last projection', () => {
        const inputs = makeInputs();
        const onlyLast = [proj(64, { healthcarePremiums: 1500 }), proj(65, { healthcarePremiums: 200 })];
        expect(generateInsights(onlyLast, inputs).find(i => i.ageRange === 'Age 65')).toBeUndefined();
    });

    it('does not fire for a small change under the $1,000 threshold', () => {
        const inputs = makeInputs();
        const projections = [
            proj(64, { healthcarePremiums: 500 }),
            proj(65, { healthcarePremiums: 300 }),
            proj(66, {}),
        ];
        expect(generateInsights(projections, inputs).find(i => i.ageRange === 'Age 65')).toBeUndefined();
    });
});

describe('generateInsights — Social Security start', () => {
    it('flags a plain start at full retirement age (info)', () => {
        const inputs = makeInputs();
        inputs.income.socialSecurity.claimingAge = 67;
        const projections = [proj(67, { socialSecurity: 24000, socialSecurityReduction: 0 })];

        const insights = generateInsights(projections, inputs);
        const insight = insights.find(i => i.title === 'Social Security begins');
        expect(insight).toMatchObject({ type: 'info', icon: 'calendar', ageRange: 'Age 67' });
        expect(insight!.description).toContain('at full retirement age');
    });

    it('notes early claiming (before 67) in the description', () => {
        const inputs = makeInputs();
        inputs.income.socialSecurity.claimingAge = 62;
        const projections = [proj(62, { socialSecurity: 18000, socialSecurityReduction: 0 })];
        const insight = generateInsights(projections, inputs).find(i => i.title === 'Social Security begins');
        expect(insight!.description).toContain('reduced for early claiming');
    });

    it('notes delayed claiming (after 67) in the description', () => {
        const inputs = makeInputs();
        inputs.income.socialSecurity.claimingAge = 70;
        const projections = [proj(70, { socialSecurity: 30000, socialSecurityReduction: 0 })];
        const insight = generateInsights(projections, inputs).find(i => i.title === 'Social Security begins');
        expect(insight!.description).toContain('increased for delayed claiming');
    });

    it('flags an earnings-test reduction as a warning instead', () => {
        const inputs = makeInputs();
        inputs.income.socialSecurity.claimingAge = 64;
        const projections = [proj(64, { socialSecurity: 15000, socialSecurityReduction: 5000 })];

        const insights = generateInsights(projections, inputs);
        const insight = insights.find(i => i.title === 'Social Security starts with earnings penalty');
        expect(insight).toMatchObject({ type: 'warning', icon: 'alert-circle', ageRange: 'Age 64' });
    });
});

describe('generateInsights — RMDs begin', () => {
    it('flags the first year an RMD is actually forced', () => {
        const inputs = makeInputs();
        const projections = [
            proj(74, { rmdAmount: 0 }),
            proj(75, { rmdAmount: 20000, withdrawalsTotal: 20000, onWithdrawals: 4000 }),
        ];

        const insights = generateInsights(projections, inputs);
        const insight = insights.find(i => i.title === 'Required Minimum Distributions (RMDs) begin');
        expect(insight).toMatchObject({ type: 'warning', icon: 'alert-circle', ageRange: 'Age 75+' });
        expect(insight!.description).toContain("don't need this money");
    });

    it('notes when withdrawals exceed the RMD (extra draw needed)', () => {
        const inputs = makeInputs();
        const projections = [proj(75, { rmdAmount: 20000, withdrawalsTotal: 30000, onWithdrawals: 6000 })];
        const insight = generateInsights(projections, inputs).find(
            i => i.title === 'Required Minimum Distributions (RMDs) begin'
        );
        expect(insight!.description).toContain('additional withdrawals beyond the RMD');
    });

    it('does not fire below the $100 noise threshold', () => {
        const inputs = makeInputs();
        const projections = [proj(75, { rmdAmount: 50 })];
        expect(
            generateInsights(projections, inputs).find(i => i.title === 'Required Minimum Distributions (RMDs) begin')
        ).toBeUndefined();
    });
});

describe('generateInsights — HSA depletion', () => {
    it('flags the depletion year when the HSA started funded', () => {
        const inputs = makeInputs();
        inputs.personal.retirementAge = 65;
        inputs.accounts.hsa.balanceAtRetirement = 50_000;
        const projections = [
            proj(65, { hsaBalance: 10_000 }),
            proj(66, { hsaBalance: 5_000 }),
            proj(67, { hsaBalance: 0 }),
        ];

        const insights = generateInsights(projections, inputs);
        const insight = insights.find(i => i.title === 'HSA provides tax-free healthcare coverage');
        expect(insight).toMatchObject({ type: 'info', icon: 'calendar', ageRange: 'Ages 65-67' });
        expect(insight!.description).toContain('2 years');
    });

    it('does not fire when the HSA never started funded', () => {
        const inputs = makeInputs();
        inputs.accounts.hsa.balanceAtRetirement = 0;
        const projections = [proj(65, { hsaBalance: 0 }), proj(66, { hsaBalance: 0 })];
        expect(
            generateInsights(projections, inputs).find(i => i.title === 'HSA provides tax-free healthcare coverage')
        ).toBeUndefined();
    });

    it('does not fire when the HSA never depletes', () => {
        const inputs = makeInputs();
        inputs.accounts.hsa.balanceAtRetirement = 50_000;
        const projections = [proj(65, { hsaBalance: 40_000 }), proj(66, { hsaBalance: 30_000 })];
        expect(
            generateInsights(projections, inputs).find(i => i.title === 'HSA provides tax-free healthcare coverage')
        ).toBeUndefined();
    });
});

describe('generateInsights — one-time expenses', () => {
    it('flags a planned one-time expense above the $5,000 noise threshold', () => {
        const inputs = makeInputs();
        inputs.oneTimeExpenses = [{ id: '1', description: 'New Roof', amount: 10_000, age: 70 }];
        const projections = [proj(70, { oneTimeExpenses: 12_000 })];

        const insights = generateInsights(projections, inputs);
        const insight = insights.find(i => i.title === 'One-time expense: New Roof');
        expect(insight).toMatchObject({ type: 'event', icon: 'calendar', ageRange: 'Age 70' });
        expect(insight!.description).toContain('10.0K');
        expect(insight!.description).toContain('12.0K');
    });

    it('does not fire below the $5,000 threshold', () => {
        const inputs = makeInputs();
        inputs.oneTimeExpenses = [{ id: '1', description: 'Small trip', amount: 3_000, age: 70 }];
        const projections = [proj(70, { oneTimeExpenses: 3_000 })];
        expect(generateInsights(projections, inputs).some(i => i.type === 'event')).toBe(false);
    });
});

describe('generateInsights — part-time work', () => {
    it('flags the start of part-time work when enabled', () => {
        const inputs = makeInputs();
        inputs.income.partTimeWork = { enabled: true, annualIncome: 20_000, startAge: 65, endAge: 70 };
        const projections = [proj(65, { partTimeWork: 20_000 })];

        const insights = generateInsights(projections, inputs);
        const insight = insights.find(i => i.title === 'Part-time work begins');
        expect(insight).toMatchObject({ type: 'info', icon: 'dollar-sign', ageRange: 'Ages 65-70' });
    });

    it('does not fire when part-time work is disabled', () => {
        const inputs = makeInputs();
        inputs.income.partTimeWork = { enabled: false, annualIncome: 20_000, startAge: 65, endAge: 70 };
        const projections = [proj(65, { partTimeWork: 0 })];
        expect(generateInsights(projections, inputs).find(i => i.title === 'Part-time work begins')).toBeUndefined();
    });
});

describe('generateInsights — early portfolio growth', () => {
    it('flags growth over 10% across the first 5 years', () => {
        const inputs = makeInputs();
        const projections = [65, 66, 67, 68, 69].map((age, i) =>
            proj(age, { portfolioBalance: 1_000_000 + i * 50_000 })
        );
        const insights = generateInsights(projections, inputs);
        const insight = insights.find(i => i.title === 'Portfolio grows in early retirement');
        expect(insight).toMatchObject({ type: 'positive', icon: 'trending-up', ageRange: 'First 5 years' });
    });

    it('does not fire for growth under the 10% threshold', () => {
        const inputs = makeInputs();
        const projections = [65, 66, 67, 68, 69].map((age, i) => proj(age, { portfolioBalance: 1_000_000 + i * 5_000 }));
        expect(
            generateInsights(projections, inputs).find(i => i.title === 'Portfolio grows in early retirement')
        ).toBeUndefined();
    });

    it('does not fire with fewer than 5 years of projections', () => {
        const inputs = makeInputs();
        const projections = [65, 66, 67].map((age, i) => proj(age, { portfolioBalance: 1_000_000 + i * 200_000 }));
        expect(
            generateInsights(projections, inputs).find(i => i.title === 'Portfolio grows in early retirement')
        ).toBeUndefined();
    });
});
