// src/lib/calculations/rothConversionImpact.ts
//
// Deterministic (zero-volatility) with-vs-without comparison of a Roth conversion
// plan. Used by the results dashboard — not by the Monte Carlo worker — so the
// 10k-run path stays a single strategy.

import type { UserInputs } from '@/types';
import { DEFAULT_ROTH_CONVERSION } from '@/lib/constants';
import { RMD_START_AGE } from './rmd';
import { runCompleteSimulation, type YearlyProjection } from './yearlyProjection';

export interface RothConversionSideMetrics {
    endingBalance: number;
    lifetimeTax: number;
    preRmdTax: number;
    postRmdTax: number;
    conversionTax: number;
    totalConverted: number;
    totalRmd: number;
    projections: YearlyProjection[];
}

export interface RothConversionImpact {
    withConversion: RothConversionSideMetrics;
    withoutConversion: RothConversionSideMetrics;
    endingBalanceDelta: number;
    lifetimeTaxDelta: number;
    rmdDelta: number;
}

function summarize(projections: YearlyProjection[]): RothConversionSideMetrics {
    const last = projections[projections.length - 1];
    let lifetimeTax = 0;
    let preRmdTax = 0;
    let postRmdTax = 0;
    let conversionTax = 0;
    let totalConverted = 0;
    let totalRmd = 0;

    for (const p of projections) {
        lifetimeTax += p.taxes.total;
        conversionTax += p.taxes.onRothConversion;
        totalConverted += p.portfolio.rothConversion;
        totalRmd += p.portfolio.rmdAmount;
        if (p.age < RMD_START_AGE) preRmdTax += p.taxes.total;
        else postRmdTax += p.taxes.total;
    }

    return {
        endingBalance: last?.portfolio.balances.total ?? 0,
        lifetimeTax,
        preRmdTax,
        postRmdTax,
        conversionTax,
        totalConverted,
        totalRmd,
        projections,
    };
}

export function compareRothConversionImpact(inputs: UserInputs): RothConversionImpact {
    const withPlan = structuredClone(inputs);
    withPlan.simulation.returnStdDeviation = 0;
    withPlan.rothConversion = {
        ...(withPlan.rothConversion ?? DEFAULT_ROTH_CONVERSION),
        enabled: true,
    };

    const withoutPlan = structuredClone(withPlan);
    withoutPlan.rothConversion = { ...withPlan.rothConversion, enabled: false };

    // Zero volatility → the RNG is unused; a constant keeps both sides aligned.
    const rng = () => 0.5;
    const withConversion = summarize(runCompleteSimulation(withPlan, rng).projections);
    const withoutConversion = summarize(runCompleteSimulation(withoutPlan, rng).projections);

    return {
        withConversion,
        withoutConversion,
        endingBalanceDelta: withConversion.endingBalance - withoutConversion.endingBalance,
        lifetimeTaxDelta: withConversion.lifetimeTax - withoutConversion.lifetimeTax,
        rmdDelta: withConversion.totalRmd - withoutConversion.totalRmd,
    };
}
