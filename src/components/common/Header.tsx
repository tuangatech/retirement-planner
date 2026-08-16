// src/components/common/Header.tsx

import { useInputs } from '@/contexts/InputsContext';
import { useState } from 'react';
import { RotateCcw, FolderOpen, ArrowLeft, AlertTriangle } from 'lucide-react';
import { ScenarioStorage } from '@/lib/storage/scenarioStorage';
import { useNavigate } from 'react-router-dom';
import { ScenarioManager } from '@/components/common/ScenarioManager';
// import { exportResultsToCSV } from '@/lib/exportUtils';

interface HeaderProps {
    variant?: 'wizard' | 'results' | 'navigation';
    subtitle?: string; // For Results page to show "Analysis based on X simulations"
}

export function Header({ variant = 'wizard' }: HeaderProps) {
    const { inputs, setMode, resetToDefaults } = useInputs();
    const navigate = useNavigate();
    const scenarioCount = ScenarioStorage.getAllScenarios().length;

    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const handleResetConfirmed = () => {
        resetToDefaults();
        setShowResetConfirm(false);
        navigate('/wizard/1'); 
    };

    const handleBackToWizard = () => {
        navigate('/wizard/4');
    };

    // const handleExportCSV = () => {
    //     if (results) {
    //         exportResultsToCSV(results, inputs);
    //     }
    // };

    return (
        <>
        <header className="bg-white shadow-sm border-b">
            <div className="max-w-6xl mx-auto px-4 py-4">
                <div className="flex justify-between items-center">
                    {/* Logo (links to home) */}
                    <button onClick={() => navigate('/')} className="focus:outline-none">
                        <img src="/logo-app.png" alt="Will It Last? Retirement Planner" className="h-14 w-auto" />
                    </button>

                    {/* Context-aware action buttons */}
                    <div className="flex items-center gap-4">
                        {variant === 'wizard' ? (
                            // Wizard mode: My Scenarios + Mode Toggle + Reset
                            <>
                                {/* My Scenarios button */}
                                <button
                                    onClick={() => navigate('/scenarios')}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <FolderOpen className="w-4 h-4" />
                                    My Scenarios {scenarioCount > 0 && `(${scenarioCount})`}
                                </button>

                                {/* Mode toggle */}
                                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                                    <button
                                        onClick={() => setMode('basic')}
                                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${inputs.mode === 'basic'
                                                ? 'bg-white text-blue-600 shadow-sm'
                                                : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        Basic
                                    </button>
                                    <button
                                        onClick={() => setMode('advanced')}
                                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${inputs.mode === 'advanced'
                                                ? 'bg-white text-blue-600 shadow-sm'
                                                : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        Advanced
                                    </button>
                                </div>

                                {/* Reset button */}
                                <button
                                    onClick={() => setShowResetConfirm(true)}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                    title="Reset to defaults"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Reset
                                </button>
                            </>
                        ) : variant === 'results' ? (
                            // Results mode: Back to Wizard + Save + Export + My Scenarios
                            <>
                                {/* Back to Wizard */}
                                <button
                                    onClick={handleBackToWizard}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Wizard
                                </button>

                                {/* Save Scenario */}
                                <ScenarioManager />

                                {/* Export CSV */}
                                {/* <button
                                    onClick={handleExportCSV}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                                >
                                    <Download className="w-4 h-4" />
                                    Export CSV
                                </button> */}

                                {/* My Scenarios */}
                                <button
                                    onClick={() => navigate('/scenarios')}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <FolderOpen className="w-4 h-4" />
                                    My Scenarios {scenarioCount > 0 && `(${scenarioCount})`}
                                </button>
                            </>
                        ) : (
                            <>
                                {/* Start New Calculation */}
                                <button
                                    onClick={() => navigate('/wizard/1')}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                >
                                    Start New Calculation
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>

        {
        showResetConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
                    <div className="flex items-start gap-4 mb-5">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-1">Reset all inputs?</h3>
                            <p className="text-sm text-gray-600">
                                This will clear everything you've entered and restore default values.
                                Your saved scenarios will not be affected.
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setShowResetConfirm(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleResetConfirmed}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>
        )
    }
    </>
);
}