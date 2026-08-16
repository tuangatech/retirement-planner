// src/contexts/InputsContext.tsx

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type {
    UserInputs,
    PersonalInfo,
    RetirementPhase,
    OneTimeExpense,
    InvestmentAccount,
    HSAAccount,
    SocialSecurity,
    Pension,
    PartTimeWork,
    RentalIncome,
    TaxSettings,
    SimulationSettings,
    PreMedicareCosts,
    MedicareCosts,
} from '@/types';
import { DEFAULT_VALUES, DEFAULT_SPOUSE_SOCIAL_SECURITY } from '@/lib/constants';

interface InputsContextType {
    inputs: UserInputs;
    currentScenarioId: string | null;  // Track which scenario is loaded
    currentScenarioName: string | null;  // Track scenario name for UI
    setCurrentScenario: (id: string | null, name: string | null) => void;  // New function to set current scenario
    updatePersonal: (data: Partial<PersonalInfo>) => void;
    updatePhases: (phases: [RetirementPhase, RetirementPhase, RetirementPhase]) => void;
    addOneTimeExpense: (expense: OneTimeExpense) => void;
    removeOneTimeExpense: (id: string) => void;
    updateOneTimeExpense: (id: string, data: Partial<OneTimeExpense>) => void;
    updateAccount: (type: 'taxDeferred' | 'roth' | 'taxable', data: Partial<InvestmentAccount>) => void;
    updateHSA: (data: Partial<HSAAccount>) => void;
    updateSocialSecurity: (data: Partial<SocialSecurity>) => void;
    updateSpouseSocialSecurity: (data: Partial<SocialSecurity>) => void;
    addPension: (pension: Pension) => void;
    removePension: (id: string) => void;
    updatePension: (id: string, data: Partial<Pension>) => void;
    updatePartTimeWork: (data: Partial<PartTimeWork>) => void;
    updateRentalIncome: (data: Partial<RentalIncome>) => void;
    updateHealthcare: (type: 'preMedicare' | 'medicare', data: Partial<PreMedicareCosts & MedicareCosts>) => void;
    updateTax: (data: Partial<TaxSettings>) => void;
    updateWithdrawalStrategy: (data: Partial<UserInputs['withdrawalStrategy']>) => void;
    updateSimulation: (data: Partial<SimulationSettings>) => void;
    setMode: (mode: 'basic' | 'advanced') => void;
    resetToDefaults: () => void;
    loadFromScenario: (scenarioId: string, scenarioName: string, scenarioInputs: UserInputs) => void;  // New function to load scenario inputs
}

const InputsContext = createContext<InputsContextType | undefined>(undefined);

export function InputsProvider({ children }: { children: ReactNode }) {
    const [inputs, setInputs] = useState<UserInputs>(DEFAULT_VALUES);
    const [currentScenarioId, setCurrentScenarioId] = useState<string | null>(null); 
    const [currentScenarioName, setCurrentScenarioName] = useState<string | null>(null); 

    // Set current scenario when loading
    const setCurrentScenario = useCallback((id: string | null, name: string | null) => {
        setCurrentScenarioId(id);
        setCurrentScenarioName(name);
    }, []);

    const updatePersonal = useCallback((data: Partial<PersonalInfo>) => {
        setInputs((prev: UserInputs) => ({
            ...prev,
            personal: { ...prev.personal, ...data },
        }));
    }, []);

    const updatePhases = useCallback((phases: [RetirementPhase, RetirementPhase, RetirementPhase]) => {
        setInputs((prev: UserInputs) => ({ ...prev, phases }));
    }, []);

    const addOneTimeExpense = useCallback((expense: OneTimeExpense) => {
        setInputs((prev: UserInputs) => ({
            ...prev,
            oneTimeExpenses: [...prev.oneTimeExpenses, expense],
        }));
    }, []);

    const removeOneTimeExpense = useCallback((id: string) => {
        setInputs((prev: UserInputs) => ({
            ...prev,
            oneTimeExpenses: prev.oneTimeExpenses.filter((e: OneTimeExpense) => e.id !== id),
        }));
    }, []);

    const updateOneTimeExpense = useCallback((id: string, data: Partial<OneTimeExpense>) => {
        setInputs((prev: UserInputs) => ({
            ...prev,
            oneTimeExpenses: prev.oneTimeExpenses.map((e: OneTimeExpense) =>
                e.id === id ? { ...e, ...data } : e
            ),
        }));
    }, []);

    const updateAccount = useCallback((
        type: 'taxDeferred' | 'roth' | 'taxable',
        data: Partial<InvestmentAccount>
    ) => {
        setInputs((prev: UserInputs) => ({
            ...prev,
            accounts: {
                ...prev.accounts,
                [type]: { ...prev.accounts[type], ...data },
            },
        }));
    }, []);

    // HSA Account Update
    const updateHSA = useCallback((data: Partial<HSAAccount>) => {
        setInputs((prev: UserInputs) => ({
            ...prev,
            accounts: {
                ...prev.accounts,
                hsa: { ...prev.accounts.hsa, ...data },
            },
        }));
    }, []);

    const updateSocialSecurity = useCallback((data: Partial<SocialSecurity>) => {
        setInputs((prev: UserInputs) => ({
            ...prev,
            income: {
                ...prev.income,
                socialSecurity: { ...prev.income.socialSecurity, ...data },
            },
        }));
    }, []);

    // Spouse Social Security (MFJ). Seeds from the spouse defaults on first edit so a
    // partial update never produces an incomplete SocialSecurity object.
    const updateSpouseSocialSecurity = useCallback((data: Partial<SocialSecurity>) => {
        setInputs((prev: UserInputs) => ({
            ...prev,
            income: {
                ...prev.income,
                spouseSocialSecurity: {
                    ...(prev.income.spouseSocialSecurity ?? DEFAULT_SPOUSE_SOCIAL_SECURITY),
                    ...data,
                },
            },
        }));
    }, []);

    const addPension = useCallback((pension: Pension) => {
        setInputs((prev: UserInputs) => ({
            ...prev,
            income: {
                ...prev.income,
                pensions: [...prev.income.pensions, pension],
            },
        }));
    }, []);

    const removePension = useCallback((id: string) => {
        setInputs((prev: UserInputs) => ({
            ...prev,
            income: {
                ...prev.income,
                pensions: prev.income.pensions.filter((p: Pension) => p.id !== id),
            },
        }));
    }, []);

    const updatePension = useCallback((id: string, data: Partial<Pension>) => {
        setInputs((prev: UserInputs) => ({
            ...prev,
            income: {
                ...prev.income,
                pensions: prev.income.pensions.map((p: Pension) =>
                    p.id === id ? { ...p, ...data } : p
                ),
            },
        }));
    }, []);

    const updatePartTimeWork = useCallback((data: Partial<PartTimeWork>) => {
        setInputs((prev: UserInputs) => ({
            ...prev,
            income: {
                ...prev.income,
                partTimeWork: { ...prev.income.partTimeWork, ...data },
            },
        }));
    }, []);

    const updateRentalIncome = useCallback((data: Partial<RentalIncome>) => {
        setInputs((prev: UserInputs) => ({
            ...prev,
            income: {
                ...prev.income,
                rentalIncome: { ...prev.income.rentalIncome, ...data },
            },
        }));
    }, []);

    const updateHealthcare = useCallback((type: 'preMedicare' | 'medicare', data: Partial<PreMedicareCosts & MedicareCosts>) => {
        setInputs((prev: UserInputs) => ({
            ...prev,
            healthcare: {
                ...prev.healthcare,
                [type]: { ...prev.healthcare[type], ...data },
            },
        }));
    }, []);

    const updateTax = useCallback((data: Partial<TaxSettings>) => {
        setInputs((prev: UserInputs) => ({
            ...prev,
            tax: { ...prev.tax, ...data },
        }));
    }, []);

    const updateWithdrawalStrategy = useCallback((data: Partial<UserInputs['withdrawalStrategy']>) => {
        setInputs((prev: UserInputs) => ({
            ...prev,
            withdrawalStrategy: { ...prev.withdrawalStrategy, ...data },
        }));
    }, []);

    const updateSimulation = useCallback((data: Partial<SimulationSettings>) => {
        setInputs((prev: UserInputs) => ({
            ...prev,
            simulation: { ...prev.simulation, ...data },
        }));
    }, []);

    const setMode = useCallback((mode: 'basic' | 'advanced') => {
        setInputs((prev: UserInputs) => ({ ...prev, mode }));
    }, []);

    const resetToDefaults = useCallback(() => {
        setInputs(DEFAULT_VALUES);
        setCurrentScenarioId(null);  // Clear tracked scenario
        setCurrentScenarioName(null);
    }, []);

    const loadFromScenario = useCallback((scenarioId: string, scenarioName: string, scenarioInputs: UserInputs) => {
        setInputs(scenarioInputs);
        setCurrentScenarioId(scenarioId);
        setCurrentScenarioName(scenarioName);
    }, []);

    return (
        <InputsContext.Provider
            value={{
                inputs,
                currentScenarioId,
                currentScenarioName,
                setCurrentScenario,
                updatePersonal,
                updatePhases,
                addOneTimeExpense,
                removeOneTimeExpense,
                updateOneTimeExpense,
                updateAccount,
                updateHSA, 
                updateSocialSecurity,
                updateSpouseSocialSecurity,
                addPension,
                removePension,
                updatePension,
                updatePartTimeWork,
                updateRentalIncome,
                updateHealthcare,
                updateTax,
                updateWithdrawalStrategy,
                updateSimulation,
                setMode,
                resetToDefaults,
                loadFromScenario,
            }}
        >
            {children}
        </InputsContext.Provider>
    );
}

export function useInputs() {
    const context = useContext(InputsContext)
    if (context === undefined) {
        throw new Error('useInputs must be used within an InputsProvider')
    }
    return context
}

export type RetirementInputs = InputsContextType['inputs']