import type { SimulationResults } from '@/types'
import { UserInputs } from '@/types'
import type { YearlyProjection } from '@/lib/calculations/yearlyProjection'

export function exportResultsToCSV(
    results: SimulationResults,
    _inputs: UserInputs
) {
    const medianProjections = results.selectedRuns.p50.projections

    const headers = [
        'Year', 'Age', 'Portfolio Balance', 'Total Income',
        'Social Security', 'Pensions', 'Total Expenses',
        'Healthcare', 'Taxes', 'Net Cash Flow'
    ]

    // Create CSV rows
    const rows = medianProjections.map((projection: YearlyProjection) => [
        projection.year,
        projection.age,
        projection.portfolio.balances.total.toFixed(2),
        projection.income.totalBeforeWithdrawals.toFixed(2),
        projection.income.socialSecurity.toFixed(2),
        projection.income.pensions.toFixed(2),
        projection.expenses.total.toFixed(2),
        (projection.expenses.healthcarePremiums +
            projection.expenses.healthcareOutOfPocket).toFixed(2),
        projection.taxes.total.toFixed(2),
        projection.netCashFlow.toFixed(2)
    ])

    const csvContent = [
        headers.join(','),
        ...rows.map((row: (string | number)[]) => row.join(','))
    ].join('\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `retirement-plan-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
}