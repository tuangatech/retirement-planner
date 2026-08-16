// src/pages/ComparisonPage.tsx

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { loadScenario } from '@/lib/storage/scenarioStorage';
import { ScenarioPanel } from '@/components/comparison/ScenarioPanel';
import { DifferenceSummary } from '@/components/comparison/DifferenceSummary';
import { ResultsComparison } from '@/components/comparison/ResultsComparison';
import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import type { SavedScenario } from '@/lib/storage/scenarioStorage';

export default function ComparisonPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [scenarioA, setScenarioA] = useState<SavedScenario | null>(null);
    const [scenarioB, setScenarioB] = useState<SavedScenario | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const idA = searchParams.get('a');
        const idB = searchParams.get('b');

        if (!idA || !idB || idA === idB) {
            navigate('/scenarios');
            return;
        }

        try {
            const scnA = loadScenario(idA);
            const scnB = loadScenario(idB);

            if (!scnA) {
                console.error(`Scenario ${idA} not found`);
                navigate('/scenarios?error=scenario-not-found');
                return;
            }
            if (!scnB) {
                console.error(`Scenario ${idB} not found`);
                navigate('/scenarios?error=scenario-not-found');
                return;
            }

            setScenarioA(scnA);
            setScenarioB(scnB);
        } catch (error) {
            console.error('Failed to load scenarios:', error);
            navigate('/scenarios?error=failed-to-load');
        } finally {
            setLoading(false);
        }
    }, [searchParams, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <Header variant="navigation" />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-lg text-gray-600">Loading comparison...</div>
                </div>
                <Footer />
            </div>
        );
    }

    if (!scenarioA || !scenarioB) return null;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header variant="navigation" />

            <div className="flex-1 py-8 px-4">
                <div className="max-w-6xl mx-auto">
                    {/* Page-specific back button stays in content */}
                    <div className="mb-6">
                        <button
                            onClick={() => navigate('/scenarios')}
                            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to My Scenarios
                        </button>
                        <h1 className="text-3xl font-bold text-gray-900">Scenario Comparison</h1>
                        <p className="text-gray-600 mt-2">
                            Comparing: <span className="font-medium">{scenarioA.name}</span> vs <span className="font-medium">{scenarioB.name}</span>
                        </p>
                    </div>

                    {/* Results Comparison Section */}
                    <div className="mb-6">
                        <ResultsComparison scenarioA={scenarioA} scenarioB={scenarioB} />
                    </div>

                    {/* Input Differences Summary */}
                    <div className="mb-6">
                        <DifferenceSummary scenarioA={scenarioA} scenarioB={scenarioB} />
                    </div>

                    {/* Side-by-Side Input Details */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ScenarioPanel scenario={scenarioA} side="left" />
                        <ScenarioPanel scenario={scenarioB} side="right" />
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}