// src/components/common/ScenarioManager.tsx

import React, { useState, useEffect } from 'react';
import { useInputs } from '@/contexts/InputsContext';
import { ScenarioStorage, StorageError } from '@/lib/storage/scenarioStorage';
import { Save, X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useResults } from '@/contexts/ResultsContext';

type ToastType = 'success' | 'error' | 'info';

export interface ScenarioManagerHandle {
    openSaveDialog: (defaultName?: string) => void;
}

interface ScenarioManagerProps {
    onSaveSuccess?: () => void;
}

export const ScenarioManager = React.forwardRef<ScenarioManagerHandle, ScenarioManagerProps>(
    ({ onSaveSuccess }, ref) => {
        const { inputs, currentScenarioId, currentScenarioName, setCurrentScenario } = useInputs();
        const { results } = useResults();
        const [showSaveDialog, setShowSaveDialog] = useState(false);
        const [scenarioName, setScenarioName] = useState('');
        const [storageInfo, setStorageInfo] = useState({ used: 0, total: 0, percentage: 0 });
        const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
        const [nameError, setNameError] = useState('');
        const [saveError, setSaveError] = useState('');

        // Expose openSaveDialog method via ref
        React.useImperativeHandle(ref, () => ({
            openSaveDialog: (defaultName?: string) => {
                const name =
                    defaultName ||
                    currentScenarioName ||
                    `Scenario ${new Date().toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                    })}`;
                setScenarioName(name);
                setNameError('');
                setSaveError('');
                setShowSaveDialog(true);
            },
        }));

        useEffect(() => {
            setStorageInfo(ScenarioStorage.getStorageInfo());
        }, [showSaveDialog]);

        // Auto-hide toast after 3 seconds
        useEffect(() => {
            if (toast) {
                const timer = setTimeout(() => setToast(null), 3000);
                return () => clearTimeout(timer);
            }
        }, [toast]);

        const showToast = (message: string, type: ToastType) => {
            setToast({ message, type });
        };

        const validateName = (name: string): boolean => {
            if (!name.trim()) {
                setNameError('Scenario name is required');
                return false;
            }

            if (name.length > 50) {
                setNameError('Scenario name must be 50 characters or less');
                return false;
            }

            setNameError('');
            return true;
        };

        // Direct update without dialog
        const handleUpdate = () => {
            if (!currentScenarioId || !currentScenarioName) {
                console.error('Cannot update: no current scenario tracked');
                return;
            }

            try {
                ScenarioStorage.saveScenario(
                    currentScenarioName,
                    inputs,
                    results,
                    currentScenarioId
                );

                showToast(`Scenario "${currentScenarioName}" updated successfully`, 'success');
                onSaveSuccess?.();
            } catch (error) {
                if (error instanceof StorageError) {
                    showToast(error.userMessage, 'error');
                } else {
                    showToast('Failed to update scenario. Please try again.', 'error');
                }
                console.error('Update error:', error);
            }
        };

        // ✅ FIXED: Only for creating NEW scenarios (never updates existing)
        const handleSave = () => {
            if (!validateName(scenarioName)) {
                return;
            }

            setSaveError('');

            try {
                // ✅ CAPTURE the returned scenario
                const savedScenario = ScenarioStorage.saveScenario(scenarioName, inputs, results);

                if (savedScenario) {
                    // ✅ CRITICAL FIX: UPDATE the current scenario in context
                    // This makes the "Compare with..." button appear immediately
                    setCurrentScenario(savedScenario.id, savedScenario.name);
                }

                setShowSaveDialog(false);
                setScenarioName('');
                showToast(`Scenario "${scenarioName}" saved successfully`, 'success');
                onSaveSuccess?.();
            } catch (error) {
                if (error instanceof StorageError) {
                    if (error.code === 'DUPLICATE_NAME') {
                        setNameError(error.userMessage);
                    } else {
                        setSaveError(error.userMessage);
                    }
                } else {
                    setSaveError('An unexpected error occurred. Please try again.');
                }
                console.error('Save error:', error);
            }
        };

        const formatBytes = (bytes: number) => {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
        };

        const handleOpenSaveAsNewDialog = () => {
            setScenarioName(
                `Scenario ${new Date().toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                })}`
            );
            setNameError('');
            setSaveError('');
            setShowSaveDialog(true);
        };

        return (
            <div className="relative">
                {/* Toast Notification */}
                {toast && (
                    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
                        <div
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${toast.type === 'success'
                                ? 'bg-green-50 border border-green-200 text-green-800'
                                : toast.type === 'error'
                                    ? 'bg-red-50 border border-red-200 text-red-800'
                                    : 'bg-blue-50 border border-blue-200 text-blue-800'
                                }`}
                        >
                            {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
                            {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
                            {toast.type === 'info' && <Info className="w-5 h-5" />}
                            <span className="font-medium">{toast.message}</span>
                        </div>
                    </div>
                )}

                {currentScenarioId ? (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleUpdate}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            Update "{currentScenarioName}"
                        </button>
                        <button
                            onClick={handleOpenSaveAsNewDialog}
                            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                            Save as New
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleOpenSaveAsNewDialog}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                        <Save className="w-4 h-4" />
                        Save Scenario
                    </button>
                )}

                {/* Save Dialog - Only for creating new scenarios */}
                {showSaveDialog && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">Save Scenario</h3>
                                <button
                                    onClick={() => {
                                        setShowSaveDialog(false);
                                        setNameError('');
                                        setSaveError('');
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {saveError && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                            <div className="text-sm text-red-800">{saveError}</div>
                                        </div>
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
                                            if (nameError) validateName(e.target.value);
                                        }}
                                        onBlur={() => validateName(scenarioName)}
                                        placeholder="e.g., Conservative Plan, Early Retirement"
                                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${nameError ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                        autoFocus
                                        maxLength={50}
                                    />
                                    {nameError && <p className="text-red-600 text-sm mt-1">{nameError}</p>}
                                </div>

                                {storageInfo.percentage > 85 && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                            <div className="text-sm text-yellow-800">
                                                Storage is {storageInfo.percentage}% full ({formatBytes(storageInfo.used)} /{' '}
                                                {formatBytes(storageInfo.total)}). Consider deleting old scenarios.
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => {
                                            setShowSaveDialog(false);
                                            setNameError('');
                                            setSaveError('');
                                        }}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={!!nameError || !scenarioName.trim()}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
);

ScenarioManager.displayName = 'ScenarioManager';