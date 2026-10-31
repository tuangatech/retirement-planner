// src/types/index.ts

import { YearlyProjection } from '@/lib/calculations/yearlyProjection';

export type USState = 'AL' | 'AK' | 'AZ' | 'AR' | 'CA' | 'CO' | 'CT' | 'DE' | 'FL' | 'GA' |
    'HI' | 'ID' | 'IL' | 'IN' | 'IA' | 'KS' | 'KY' | 'LA' | 'ME' | 'MD' | 'MA' | 'MI' |
    'MN' | 'MS' | 'MO' | 'MT' | 'NE' | 'NV' | 'NH' | 'NJ' | 'NM' | 'NY' | 'NC' | 'ND' |
    'OH' | 'OK' | 'OR' | 'PA' | 'RI' | 'SC' | 'SD' | 'TN' | 'TX' | 'UT' | 'VT' | 'VA' |
    'WA' | 'WV' | 'WI' | 'WY' | 'DC';

export interface PersonalInfo {
    retirementAge: number;
    lifeExpectancy: number;
    state: USState;
    // Optional; the tax model defaults to 'single' when unset.
    filingStatus?: 'single' | 'married_joint';
    // MFJ only: the spouse's age in the year the primary retires. The simulation
    // is driven by the primary's age, so each year the spouse's age is derived as
    // spouseAgeAtRetirement + (currentAge − retirementAge). Used for per-spouse
    // age-65 deduction additions and the (older-spouse) RMD trigger. Phase 1 models
    // a couple as pooled accounts, one shared life expectancy, and no survivor
    // penalty — see docs/2-federal-tax-model.md.
    spouseAgeAtRetirement?: number;
}

export interface RetirementPhase {
    name: 'go_go' | 'slow_go' | 'no_go';
    startAge: number;
    endAge: number;
    annualSpending: number;
}

export interface OneTimeExpense {
    id: string;
    description: string;
    amount: number;
    age: number;
}

export interface InvestmentAccount {
    balanceAtRetirement: number;
    expectedReturnRate: number;
    costBasisPercentage?: number; // Only for taxable accounts
}

export interface HSAAccount {
    balanceAtRetirement: number;
    expectedReturnRate: number;
    allowNonMedicalAfter65: boolean;  // Default: false - healthcare withdrawals after 65 only
}

export interface SocialSecurity {
    monthlyBenefitAtFRA: number;
    claimingAge: number;
    colaRate: number;
    taxablePercentage: number;
}

export interface Pension {
    id: string;
    name: string;
    monthlyAmount: number;
    startAge: number;
    colaRate: number;
    // Government pensions (federal/state/local/military) are fully state-tax-exempt in some
    // modeled states (New York); private pensions get a smaller, capped exclusion instead.
    // Optional so pre-existing saved pensions stay valid — undefined reads as private, the
    // conservative default (it never grants an exemption a pre-existing plan didn't ask for).
    isGovernment?: boolean;
}

export interface PartTimeWork {
    enabled: boolean;
    annualIncome: number;
    startAge: number;
    endAge: number;
}

export interface RentalIncome {
    enabled: boolean;
    annualNetIncome: number;
    startAge: number;
    endAge: number | null;
    inflationAdjusted: boolean;
}

export interface PreMedicareCosts {
    monthlyPremium: number;
    annualOutOfPocket: number;
}

export interface MedicareCosts {
    partBStandardPremium: number;
    partDPremium: number;
    expectIRMAA: boolean;
    irmaaSurcharge: number;
    medigapPremium: number;
    outOfPocketByPhase: {
        phase1: number;
        phase2: number;
        phase3: number;
    };
}

export interface TaxSettings {
    combinedEffectiveRate: number;

    /**
     * Whether the engine computes the selected state's income tax itself.
     * - 'manual'  — `combinedEffectiveRate` is federal + state, folded together by the user.
     * - 'modeled' — `combinedEffectiveRate` is FEDERAL ONLY; state tax is computed from
     *               `stateTaxRules.json` for the states we model.
     *
     * Optional so scenarios saved before state tax existed stay valid. The engine and the
     * storage loader default a missing value to 'manual' so an old plan recomputes exactly as
     * it did when it was saved — switching it to 'modeled' would silently tax it twice
     * (state points are already inside its saved rate). New scenarios get 'modeled' from
     * DEFAULT_VALUES. See docs/5-state-tax-model.md.
     */
    stateTaxMode?: 'manual' | 'modeled';
}

export interface SimulationSettings {
    numberOfRuns: 1000 | 5000 | 10000;
    generalInflationRate: number;
    healthcareInflationRate: number;
    returnStdDeviation: number;
}

/**
 * Gap-year Roth conversion plan. Optional so scenarios saved before this feature
 * stay valid — missing values load as disabled (see scenarioStorage). When enabled,
 * the engine converts tax-deferred → Roth each year in [startAge, endAge].
 */
export interface RothConversionStrategy {
    enabled: boolean;
    /** First age (inclusive) to convert. Typically retirement / start of the gap years. */
    startAge: number;
    /** Last age (inclusive) to convert. Typically before Social Security and RMDs. */
    endAge: number;
    strategyType: 'fixed_amount' | 'bracket_fill';
    /** Annual conversion amount if strategyType is 'fixed_amount'. */
    fixedAmount?: number;
    /** Ordinary-income bracket to fill to if strategyType is 'bracket_fill' (e.g. 0.12, 0.22, 0.24). */
    targetTaxBracket?: number;
    /**
     * Where the conversion tax is paid:
     * - 'taxable_cash' — pay from the taxable/brokerage account (preferred; preserves Roth principal).
     * - 'conversion_proceeds' — withhold from the converted amount (smaller Roth balance).
     */
    payTaxFromAccount: 'taxable_cash' | 'conversion_proceeds';
}

export interface UserInputs {
    personal: PersonalInfo;
    phases: [RetirementPhase, RetirementPhase, RetirementPhase];
    oneTimeExpenses: OneTimeExpense[];
    accounts: {
        taxDeferred: InvestmentAccount;
        roth: InvestmentAccount;
        taxable: InvestmentAccount;
        hsa: HSAAccount;
    };
    withdrawalStrategy: {
        priorityOrder: Array<'taxable' | 'tax_deferred' | 'roth'>;
        // Note: HSA is handled separately - always used first for healthcare

        /**
         * Which sequencing strategy the engine applies:
         * - 'standard'        — spend strictly by priorityOrder (the conventional rule of thumb).
         * - 'tax_smart'       — each gap year, draw tax-deferred up to the standard-deduction
         *                       floor (≈ tax-free), then fall through to priorityOrder. Default.
         * - 'roth_conversion' — tax-smart sequencing; the conversion itself is driven by
         *                       `rothConversion` (enabled + ages + amount/bracket).
         * Optional so pre-existing saved scenarios (which lack it) stay valid; the engine and
         * the storage loader default a missing value to keep old plans faithful to how they
         * were computed.
         */
        strategy?: 'standard' | 'tax_smart' | 'roth_conversion';

        /** @deprecated Use `rothConversion.targetTaxBracket` / `fixedAmount`. Kept so older saved scenarios still type-check. */
        conversionCeiling?: number;
    };
    /**
     * Optional so pre-existing saved scenarios stay valid. Missing values load as
     * disabled — an old plan must not start converting just because the feature shipped.
     */
    rothConversion?: RothConversionStrategy;
    income: {
        socialSecurity: SocialSecurity;
        // MFJ only: the spouse's own Social Security. Summed with the primary's
        // benefit into a single household SS stream before the provisional-income
        // formula. Absent for single filers.
        spouseSocialSecurity?: SocialSecurity;
        pensions: Pension[];
        partTimeWork: PartTimeWork;
        rentalIncome: RentalIncome;
    };
    healthcare: {
        preMedicare: PreMedicareCosts;
        medicare: MedicareCosts;
    };
    tax: TaxSettings;
    simulation: SimulationSettings;
    mode: 'basic' | 'advanced';
}

export interface SimulationRun {
    runId: number;
    success: boolean;
    ageOfDepletion: number | null;
    finalBalance: number;
}

export interface SelectedRun {
    runId: number;
    percentile: 'p10' | 'p50' | 'p90';
    projections: YearlyProjection[];
}

export interface SimulationResults {
    timestamp: number;
    numberOfRuns: number;
    successRate: number;

    percentiles: {
        p10: number;
        p25: number;
        p50: number;
        p75: number;
        p90: number;
    };

    failedRuns: {
        count: number;
        medianAgeOfDepletion: number | null;
    };

    selectedRuns: {
        p10: SelectedRun;
        p50: SelectedRun;
        p90: SelectedRun;
    };

    // Optional fields not needed for storage/comparison
    sampleRuns?: Array<{
        runId: number;
        projections: YearlyProjection[];
    }>;
}