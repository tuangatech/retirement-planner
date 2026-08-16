// src/pages/ScenariosPage.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllScenarios, deleteScenario, saveScenario, ScenarioStorage, MAX_SCENARIOS } from '@/lib/storage/scenarioStorage';
import { ScenarioCard } from '@/components/scenarios/ScenarioCard';
import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { GitCompare, ArrowLeft, Save, AlertCircle } from 'lucide-react';
import type { SavedScenario } from '@/lib/storage/scenarioStorage';
import { useInputs } from '@/contexts/InputsContext';
import { useResults } from '@/contexts/ResultsContext';
import { useSearchParams } from 'react-router-dom';

export default function ScenariosPage() {
    const navigate = useNavigate();
    const { inputs, loadFromScenario, currentScenarioId, setCurrentScenario } = useInputs();
    const { results } = useResults();

    const [scenarios, setScenarios] = useState<SavedScenario[]>(() => getAllScenarios());
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Save dialog state
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [scenarioName, setScenarioName] = useState('');
    const [saveError, setSaveError] = useState('');
    const [searchParams, setSearchParams] = useSearchParams();

    const compareScenarioId = searchParams.get('compare');

    useEffect(() => {
        refreshScenarios();
    }, []);

    // Error handling effect
    useEffect(() => {
        const error = searchParams.get('error');
        if (error) {
            const errorMessages: Record<string, string> = {
                'scenario-not-found': 'One or both scenarios could not be found. They may have been deleted.',
                'load-failed': 'Failed to load scenarios for comparison.',
            };

            const message = errorMessages[error] || 'An error occurred.';
            alert(message);

            setSearchParams({});
        }
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        if (compareScenarioId) {
            const scenario = scenarios.find(s => s.id === compareScenarioId);

            if (!scenario) {
                setSearchParams({});
                alert('The scenario you are trying to compare no longer exists.');
                return;
            }
        }
    }, [compareScenarioId, scenarios, setSearchParams]);

    const refreshScenarios = () => {
        setScenarios(getAllScenarios());
    };

    const handleDelete = (id: string) => {
        const scenario = scenarios.find(s => s.id === id);
        if (scenario && window.confirm(`Delete scenario "${scenario.name}"? This cannot be undone.`)) {
            deleteScenario(id);
            refreshScenarios();
            setSelectedIds(prev => prev.filter(sid => sid !== id));

            if (id === compareScenarioId) {
                setSearchParams({});
                setSelectionMode(false);
            }
        }
    };

    const toggleSelection = (id: string) => {
        if (compareScenarioId) {
            navigate(`/compare?a=${compareScenarioId}&b=${id}`);
            return;
        }

        setSelectedIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(sid => sid !== id);
            }
            if (prev.length >= 2) {
                return [prev[1], id];
            }
            return [...prev, id];
        });
    };

    const handleCompare = () => {
        if (selectedIds.length === 2) {
            navigate(`/compare?a=${selectedIds[0]}&b=${selectedIds[1]}`);
        }
    };

    const handleCreateNew = () => {
        navigate('/wizard/1');
    };

    const handleLoad = (scenario: SavedScenario) => {
        loadFromScenario(scenario.id, scenario.name, scenario.inputs);
        navigate('/wizard/1');
    };

    const handleSaveNew = () => {
        if (!scenarioName.trim()) {
            setSaveError('Scenario name is required');
            return;
        }

        if (ScenarioStorage.scenarioNameExists(scenarioName)) {
            setSaveError('A scenario with this name already exists');
            return;
        }

        try {
            const savedScenario = saveScenario(scenarioName, inputs, results);
            if (savedScenario) {
                setCurrentScenario(savedScenario.id, savedScenario.name);
            }
            refreshScenarios();
            setShowSaveDialog(false);
            setScenarioName('');
            setSaveError('');
            alert(`Scenario "${scenarioName}" saved successfully!`);
        } catch (error) {
            const message = (error as { userMessage?: string })?.userMessage;
            setSaveError(message || 'Failed to save scenario');
        }
    };

    if (scenarios.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <Header variant="navigation" />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">No Saved Scenarios</h2>
                        <p className="text-gray-600 mb-6">Run a calculation and save it to see it here.</p>
                        <button
                            onClick={handleCreateNew}
                            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Start New Calculation
                        </button>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    const displayScenarios = compareScenarioId
        ? scenarios.filter(s => s.id !== compareScenarioId)
        : scenarios;

    const compareScenarioName = compareScenarioId
        ? scenarios.find(s => s.id === compareScenarioId)?.name
        : null;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header variant="navigation" />

            <div className="flex-1 py-8 px-4">
                <div className="max-w-6xl mx-auto">
                    {/* Page-specific back button stays in content */}
                    <div className="mb-8">
                        <button
                            onClick={() => navigate('/wizard/4')}
                            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Back to Wizard
                        </button>
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">My Scenarios</h1>
                                <p className={scenarios.length >= MAX_SCENARIOS ? "text-amber-700 font-medium" : "text-gray-600"}>
                                    {scenarios.length} of {MAX_SCENARIOS} scenarios saved
                                    {scenarios.length >= MAX_SCENARIOS && " (Maximum reached)"}
                                </p>
                                {scenarios.length >= MAX_SCENARIOS && (
                                    <p className="text-sm text-amber-600 mt-1">
                                        Delete a scenario to save a new one
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    setScenarioName(
                                        `Scenario ${new Date().toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}`
                                    );
                                    setSaveError('');
                                    setShowSaveDialog(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                            >
                                <Save className="w-5 h-5" />
                                Save Current Inputs
                            </button>
                        </div>
                    </div>

                    {compareScenarioId && compareScenarioName && (
                        <div className="mb-6 bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                                <GitCompare className="w-5 h-5 text-blue-600" />
                                <div className="flex-1">
                                    <p className="font-semibold text-blue-900">
                                        Comparing from: "{compareScenarioName}"
                                    </p>
                                    <p className="text-sm text-blue-700">
                                        Click any scenario below to compare side-by-side
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setSearchParams({});
                                        setSelectionMode(false);
                                        setSelectedIds([]);
                                    }}
                                    className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Actions Bar */}
                    {scenarios.length >= 2 && !compareScenarioId && (
                        <div className="mb-6 bg-white p-4 rounded-lg shadow">
                            {!selectionMode ? (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <GitCompare className="w-6 h-6 text-blue-600" />
                                        <div>
                                            <h3 className="font-semibold text-gray-900">Compare Scenarios</h3>
                                            <p className="text-sm text-gray-600">
                                                Select 2 scenarios to compare side-by-side
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectionMode(true)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                                    >
                                        <GitCompare className="w-4 h-4" />
                                        Start Comparing
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => {
                                            setSelectionMode(false);
                                            setSelectedIds([]);
                                        }}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>

                                    <span className="text-sm text-gray-600">
                                        Select 2 scenarios to compare ({selectedIds.length}/2)
                                    </span>

                                    <button
                                        onClick={handleCompare}
                                        disabled={selectedIds.length !== 2}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        <GitCompare className="w-4 h-4" />
                                        Compare Selected →
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {compareScenarioId && displayScenarios.length === 0 && (
                        <div className="mb-6 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-yellow-600" />
                                <div>
                                    <p className="font-semibold text-yellow-900">
                                        No other scenarios available
                                    </p>
                                    <p className="text-sm text-yellow-800">
                                        You need at least 2 saved scenarios to use the comparison feature.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Scenario Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {displayScenarios.map(scenario => (
                            <ScenarioCard
                                key={scenario.id}
                                scenario={scenario}
                                selectionMode={selectionMode}
                                quickCompareMode={!!compareScenarioId}
                                currentScenarioId={currentScenarioId}
                                isSelected={selectedIds.includes(scenario.id)}
                                onSelect={() => toggleSelection(scenario.id)}
                                onDelete={() => handleDelete(scenario.id)}
                                onLoad={() => handleLoad(scenario)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <Footer />

            {/* Save Dialog */}
            {showSaveDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Save New Scenario</h3>
                            <button
                                onClick={() => {
                                    setShowSaveDialog(false);
                                    setSaveError('');
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <span className="text-2xl">&times;</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            {saveError && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                                    {saveError}
                                </div>
                            )}

                            <div>
                                <label htmlFor="scenario-name" className="block text-sm font-medium mb-2">
                                    Scenario Name
                                </label>
                                <input
                                    id="scenario-name"
                                    type="text"
                                    value={scenarioName}
                                    onChange={(e) => {
                                        setScenarioName(e.target.value);
                                        setSaveError('');
                                    }}
                                    placeholder="e.g., Conservative Plan, Early Retirement"
                                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                    maxLength={50}
                                />
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => {
                                        setShowSaveDialog(false);
                                        setSaveError('');
                                    }}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveNew}
                                    disabled={!scenarioName.trim()}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}