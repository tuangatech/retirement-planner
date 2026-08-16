// src/pages/WizardPage.tsx

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { WizardProgress } from '@/components/wizard/WizardProgress';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import { Screen1Plan } from '@/components/wizard/Screen1Plan';
import { Screen2SavingsIncome } from '@/components/wizard/Screen2SavingsIncome';
import { Screen3Healthcare } from '@/components/wizard/Screen3Healthcare';
import { Screen4Assumptions } from '@/components/wizard/Screen4Assumptions';
import { useResults } from '@/contexts/ResultsContext';
import { useInputs } from '@/contexts/InputsContext';
import { trackPageView, trackWizardStep, trackCalculationStart } from '@/lib/analytics';
import AssumptionsPanel from '@/components/results/AssumptionsPanel';
import { Info, X } from 'lucide-react';


const STEPS = [
    { component: Screen1Plan, title: 'Your Plan' },
    { component: Screen2SavingsIncome, title: 'Savings & Income' },
    { component: Screen3Healthcare, title: 'Healthcare' },
    { component: Screen4Assumptions, title: 'Assumptions & Strategy' },
];

export default function WizardPage() {
    const navigate = useNavigate();
    const params = useParams<{ step: string }>();

    // Parse step from URL, default to 1
    const urlStep = parseInt(params.step || '1', 10);
    const [currentStep, setCurrentStep] = useState(
        Math.max(1, Math.min(urlStep, STEPS.length)) - 1 // 0-indexed
    );

    const { calculate, isCalculating, calculationProgress } = useResults();
    const { inputs } = useInputs();
    const [showDisclosures, setShowDisclosures] = useState(false);

    // Track step changes for analytics
    const [stepStartTime, setStepStartTime] = useState<number>(Date.now());

    // Sync currentStep when URL is changed externally (e.g., reset from Header)
    useEffect(() => {
        const newStep = Math.max(1, Math.min(urlStep, STEPS.length)) - 1;
        setCurrentStep(newStep);
    }, [urlStep]);

    // Sync URL with current step
    useEffect(() => {
        const displayStep = currentStep + 1;  // 1-indexed for display/URL
        trackPageView(`wizard_step_${displayStep}`);
        setStepStartTime(Date.now());
    }, [currentStep]);

    const CurrentStepComponent = STEPS[currentStep].component;

    const handleNext = () => {
        const timeSpent = Date.now() - stepStartTime;
        trackWizardStep(currentStep + 1, timeSpent);
        if (currentStep < STEPS.length - 1) {
            navigate(`/wizard/${currentStep + 2}`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            navigate(`/wizard/${currentStep}`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleCalculate = async () => {
        // Track final step completion
        const timeSpent = Date.now() - stepStartTime;
        trackWizardStep(STEPS.length, timeSpent);

        // Track calculation start
        trackCalculationStart(inputs.simulation.numberOfRuns);

        // Run calculation
        await calculate(inputs);

        navigate('/results');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col">
            <Header variant="wizard" />

            <main className="w-full max-w-6xl mx-auto px-4 py-8 flex-1">
                <WizardProgress
                    currentStep={currentStep}
                    totalSteps={STEPS.length}
                    stepTitles={STEPS.map((s) => s.title)}
                    onStepClick={(step) => {
                        navigate(`/wizard/${step + 1}`);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                />

                {/* Calculation Progress */}
                {isCalculating && (
                    <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-blue-900">
                                Running Monte Carlo simulation...
                            </span>
                            <span className="text-sm font-semibold text-blue-900">
                                {calculationProgress}%
                            </span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${calculationProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Step Content */}
                <div className="relative bg-white rounded-xl shadow-lg p-8 mb-8">
                    <button
                        type="button"
                        onClick={() => setShowDisclosures(true)}
                        className="absolute top-8 right-8 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                        <Info className="w-4 h-4" /> Disclosures
                    </button>
                    <CurrentStepComponent />
                </div>

                {/* Navigation */}
                <WizardNavigation
                    currentStep={currentStep}
                    totalSteps={STEPS.length}
                    onBack={handleBack}
                    onNext={handleNext}
                    onCalculate={handleCalculate}
                    isCalculating={isCalculating}
                />
            </main>

            <Footer />

            {/* Disclosures modal — reuses AssumptionsPanel so there's one source of truth */}
            {showDisclosures && (
                <div
                    className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto"
                    onClick={() => setShowDisclosures(false)}
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full my-8" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b px-6 py-4 sticky top-0 bg-white rounded-t-xl">
                            <h3 className="text-lg font-semibold">Assumptions &amp; Limitations</h3>
                            <button
                                type="button"
                                onClick={() => setShowDisclosures(false)}
                                className="text-gray-500 hover:text-gray-700 p-1"
                                aria-label="Close disclosures"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <AssumptionsPanel inputs={inputs} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}