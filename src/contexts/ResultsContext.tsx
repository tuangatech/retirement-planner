import { createContext, useContext, useState, ReactNode } from 'react'
import type { SimulationResults, UserInputs } from '@/types'

interface ResultsContextType {
    results: SimulationResults | null
    setResults: (results: SimulationResults | null) => void
    isCalculating: boolean
    setIsCalculating: (calculating: boolean) => void
    calculationProgress: number
    setCalculationProgress: (progress: number) => void
    error: string | null
    setError: (error: string | null) => void
    calculate: (inputs: UserInputs) => Promise<void>
}

const ResultsContext = createContext<ResultsContextType | undefined>(undefined)

export function ResultsProvider({ children }: { children: ReactNode }) {
    const [results, setResults] = useState<SimulationResults | null>(null)
    const [isCalculating, setIsCalculating] = useState(false)
    const [calculationProgress, setCalculationProgress] = useState(0)
    const [error, setError] = useState<string | null>(null)

    const calculate = async (inputs: UserInputs) => {
        setIsCalculating(true)
        setCalculationProgress(0)
        setError(null)

        return new Promise<void>((resolve, reject) => {
            try {
                // Create Web Worker
                const worker = new Worker(
                    new URL('@/workers/monte-carlo.worker.ts', import.meta.url),
                    { type: 'module' }
                )

                // Listen for messages from worker
                worker.onmessage = (e: MessageEvent) => {
                    if (e.data.type === 'PROGRESS') {
                        setCalculationProgress(e.data.progress)
                    } else if (e.data.type === 'COMPLETE') {
                        setResults(e.data.results)  // → SimulationResults
                        setIsCalculating(false)
                        setCalculationProgress(100)
                        worker.terminate()
                        resolve()
                    } else if (e.data.type === 'ERROR') {
                        setError(e.data.error)
                        setIsCalculating(false)
                        worker.terminate()
                        reject(new Error(e.data.error));
                    }
                }

                // Handle worker errors
                worker.onerror = (error) => {
                    setError(`Calculation error: ${error.message}`)
                    setIsCalculating(false)
                    worker.terminate()
                    reject(error);
                }

                // Send inputs to worker
                worker.postMessage({
                    type: 'START',
                    inputs: inputs,
                    numberOfRuns: inputs.simulation.numberOfRuns
                })

            } catch (err) {
                setError(err instanceof Error ? err.message : 'Calculation failed')
                setIsCalculating(false)
                reject(err);
            }
        });
    }

    return (
        <ResultsContext.Provider
            value={{
                results,
                setResults,
                isCalculating,
                setIsCalculating,
                calculationProgress,
                setCalculationProgress,
                error,
                setError,
                calculate,
            }}
        >
            {children}
        </ResultsContext.Provider>
    )
}

export function useResults() {
    const context = useContext(ResultsContext)
    if (context === undefined) {
        throw new Error('useResults must be used within a ResultsProvider')
    }
    return context
}