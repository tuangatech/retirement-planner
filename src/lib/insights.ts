// src/lib/insights.ts
// Smart-insights rules for the Annual Breakdown table. Pure — no React, no DOM — so the
// icon a caller renders is a choice the component makes, not this module (see
// components/results/InsightCard.tsx for the icon mapping).

import type { UserInputs } from '@/types';
import type { YearlyProjection } from '@/lib/calculations/yearlyProjection';

export type InsightIcon = 'alert-circle' | 'calendar' | 'trending-up' | 'dollar-sign';

export interface Insight {
    type: 'positive' | 'info' | 'warning' | 'event';
    icon: InsightIcon;
    title: string;
    description: string;
    ageRange?: string;
}

export function generateInsights(projections: YearlyProjection[], inputs: UserInputs): Insight[] {
    const insights: Insight[] = [];

    // 1. Zero Withdrawal Period Detection
    const firstWithdrawalIndex = projections.findIndex(p => p.portfolio.withdrawals.total > 100);
    if (firstWithdrawalIndex > 0) {
        const firstWithdrawalAge = projections[firstWithdrawalIndex].age;
        const zeroWithdrawalYears = firstWithdrawalAge - inputs.personal.retirementAge;

        insights.push({
            type: 'positive',
            icon: 'alert-circle',
            title: 'No withdrawals needed in early retirement!',
            ageRange: `Ages ${inputs.personal.retirementAge}-${firstWithdrawalAge - 1}`,
            description: `Your income plus portfolio returns cover all expenses for the first ${zeroWithdrawalYears} years. Your portfolio actually grows during this period, providing a strong foundation for later years.`
        });
    }

    // 2. Medicare Start (Age 65)
    const medicareIndex = projections.findIndex(p => p.age === 65);
    if (medicareIndex > 0 && medicareIndex < projections.length - 1) {
        const preMedicareHealthcare =
            projections[medicareIndex - 1].expenses.healthcarePremiums +
            projections[medicareIndex - 1].expenses.healthcareOutOfPocket;
        const medicareHealthcare =
            projections[medicareIndex].expenses.healthcarePremiums +
            projections[medicareIndex].expenses.healthcareOutOfPocket;
        const healthcareDrop = preMedicareHealthcare - medicareHealthcare;

        if (healthcareDrop > 1000) {
            insights.push({
                type: 'info',
                icon: 'calendar',
                title: 'Medicare eligibility begins',
                ageRange: 'Age 65',
                description: `Healthcare costs decrease by approximately ${(healthcareDrop / 1000).toFixed(1)}K/year as you transition from private insurance to Medicare coverage. This improves your cash flow and reduces pressure on your portfolio.`
            });
        } else if (healthcareDrop < -1000) {
            insights.push({
                type: 'warning',
                icon: 'alert-circle',
                title: 'Medicare begins with higher costs',
                ageRange: 'Age 65',
                description: `Healthcare costs increase by approximately ${(Math.abs(healthcareDrop) / 1000).toFixed(1)}K/year, likely due to higher out-of-pocket expenses or IRMAA surcharges. Consider reviewing your Medicare coverage options.`
            });
        }
    }

    // 3. Social Security Start
    const ssClaimingAge = inputs.income.socialSecurity.claimingAge;
    const ssStartIndex = projections.findIndex(p => p.age === ssClaimingAge);
    if (ssStartIndex >= 0) {
        const ssAmount = projections[ssStartIndex].income.socialSecurity;
        const earningsReduction = projections[ssStartIndex].income.socialSecurityReduction;

        if (earningsReduction > 100) {
            insights.push({
                type: 'warning',
                icon: 'alert-circle',
                title: 'Social Security starts with earnings penalty',
                ageRange: `Age ${ssClaimingAge}`,
                description: `Your benefit of ${(ssAmount / 1000).toFixed(1)}K/year is reduced by ${(earningsReduction / 1000).toFixed(1)}K due to the earnings test (you're working while claiming before age 67). Consider delaying your claim or reducing work hours.`
            });
        } else {
            insights.push({
                type: 'info',
                icon: 'calendar',
                title: 'Social Security begins',
                ageRange: `Age ${ssClaimingAge}`,
                description: `You start receiving approximately ${(ssAmount / 1000).toFixed(1)}K/year in Social Security benefits${ssClaimingAge < 67 ? ' (reduced for early claiming)' : ssClaimingAge > 67 ? ' (increased for delayed claiming)' : ' (at full retirement age)'}. This provides a reliable income floor for the rest of your life.`
            });
        }
    }

    // 4. RMD Start (age 75) — find the first year an RMD is actually forced.
    const rmdIndex = projections.findIndex(p => p.portfolio.rmdAmount > 0.5);
    if (rmdIndex >= 0) {
        const rmdAmount = projections[rmdIndex].portfolio.rmdAmount;
        const rmdTax = projections[rmdIndex].taxes.onWithdrawals;
        const withdrawal = projections[rmdIndex].portfolio.withdrawals.total;

        if (rmdAmount > 100) {
            insights.push({
                type: 'warning',
                icon: 'alert-circle',
                title: 'Required Minimum Distributions (RMDs) begin',
                ageRange: `Age ${projections[rmdIndex].age}+`,
                description: `The IRS requires you to withdraw at least ${(rmdAmount / 1000).toFixed(1)}K/year from tax-deferred accounts and pay approximately ${(rmdTax / 1000).toFixed(1)}K in taxes. ${withdrawal > rmdAmount * 1.1 ? 'You need additional withdrawals beyond the RMD to cover expenses.' : 'You don\'t need this money for expenses, so after-tax proceeds get reinvested to your taxable account.'}`
            });
        }
    }

    // 5. HSA Depletion Detection
    const hsaDepletionIndex = projections.findIndex(p => p.portfolio.balances.hsa < 100);
    if (hsaDepletionIndex > 0 && inputs.accounts.hsa.balanceAtRetirement > 0) {
        const depletionYear = projections[hsaDepletionIndex];
        const yearsOfCoverage = depletionYear.age - inputs.personal.retirementAge;

        insights.push({
            type: 'info',
            icon: 'calendar',
            title: 'HSA provides tax-free healthcare coverage',
            ageRange: `Ages ${inputs.personal.retirementAge}-${depletionYear.age}`,
            description: `Your HSA covers healthcare tax-free for ${yearsOfCoverage} years. After depletion at age ${depletionYear.age}, healthcare costs shift to other accounts (taxed).`
        });
    }

    // 6. One-Time Expenses Detection
    const oneTimeExpenses = projections.filter(p => p.expenses.oneTimeExpenses > 5000);
    oneTimeExpenses.forEach(p => {
        const expense = inputs.oneTimeExpenses.find(e => e.age === p.age);
        if (expense) {
            insights.push({
                type: 'event',
                icon: 'calendar',
                title: `One-time expense: ${expense.description}`,
                ageRange: `Age ${p.age}`,
                description: `Planned expense of ${(expense.amount / 1000).toFixed(1)}K (inflated to ${(p.expenses.oneTimeExpenses / 1000).toFixed(1)}K in future dollars). This creates a temporary spike in expenses and may require larger portfolio withdrawals this year.`
            });
        }
    });

    // 7. Part-Time Work Detection
    if (inputs.income.partTimeWork.enabled) {
        const workStartIndex = projections.findIndex(p => p.age === inputs.income.partTimeWork.startAge);

        if (workStartIndex >= 0) {
            const workIncome = projections[workStartIndex].income.partTimeWork;
            insights.push({
                type: 'info',
                icon: 'dollar-sign',
                title: 'Part-time work begins',
                ageRange: `Ages ${inputs.income.partTimeWork.startAge}-${inputs.income.partTimeWork.endAge}`,
                description: `You earn approximately ${(workIncome / 1000).toFixed(1)}K/year from part-time work. This supplemental income reduces portfolio withdrawals and extends your plan's sustainability.`
            });
        }
    }

    // 8. Portfolio Growth Detection (first 5 years)
    if (projections.length >= 5) {
        const startPortfolio = projections[0].portfolio.balances.total;
        const year5Portfolio = projections[4].portfolio.balances.total;
        const portfolioGrowth = year5Portfolio - startPortfolio;

        if (portfolioGrowth > startPortfolio * 0.1) {
            insights.push({
                type: 'positive',
                icon: 'trending-up',
                title: 'Portfolio grows in early retirement',
                ageRange: 'First 5 years',
                description: `Your portfolio increases by approximately ${(portfolioGrowth / 1000).toFixed(0)}K (${((portfolioGrowth / startPortfolio) * 100).toFixed(0)}%) during early retirement. Market returns exceed withdrawals, strengthening your financial position.`
            });
        }
    }

    return insights;
}
