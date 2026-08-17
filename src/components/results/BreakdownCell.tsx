// src/components/results/BreakdownCell.tsx
// Per-row breakdown cell for AnnualTable: shows the figure with a hover tooltip itemizing
// the components that sum to it. Non-zero components only; empty years show emptyText.

import { formatMoney } from '@/lib/format';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export interface BreakdownLine {
    label: string;
    value: number;
}

export function BreakdownCell({
    value,
    className,
    lines,
    notes,
    emptyText,
    totalLabel = 'Total',
    minValue = 0.5,
}: {
    value: number;
    className: string;
    lines: BreakdownLine[];
    notes?: string[];
    emptyText?: string;
    totalLabel?: string;
    // Line items with |value| below this are hidden (e.g. sub-$1,000 residual balances).
    minValue?: number;
}) {
    const shown = lines.filter((l) => Math.abs(l.value) >= minValue);

    return (
        <td className={`px-4 py-3 text-right ${className}`}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="cursor-help underline decoration-dotted decoration-gray-400/60 underline-offset-4">
                        {formatMoney(value)}
                    </span>
                </TooltipTrigger>
                <TooltipContent className="text-left max-w-[15rem]">
                    {shown.length === 0 ? (
                        <div>{emptyText ?? 'No components'}</div>
                    ) : (
                        <div className="space-y-1">
                            {shown.map((l, i) => (
                                <div key={i} className="flex justify-between gap-6">
                                    <span className="opacity-70">{l.label}</span>
                                    <span className="font-medium tabular-nums">{formatMoney(l.value)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between gap-6 border-t border-primary-foreground/30 pt-1 mt-1">
                                <span>{totalLabel}</span>
                                <span className="font-semibold tabular-nums">{formatMoney(value)}</span>
                            </div>
                            {notes?.map((n, i) => (
                                <div key={i} className="opacity-70 italic pt-0.5">{n}</div>
                            ))}
                        </div>
                    )}
                </TooltipContent>
            </Tooltip>
        </td>
    );
}
