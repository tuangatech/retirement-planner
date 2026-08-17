// src/components/common/PercentField.tsx
// "%"-suffixed number field with label, inline help, and helper text — the pattern
// repeated across the wizard screens' rate/percentage inputs. Value is stored as a
// decimal fraction (e.g. 0.03) and displayed as a percentage (e.g. "3.0").

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PercentFieldProps {
    label?: string;
    help?: ReactNode;
    value: number;
    onChange: (value: number) => void;
    helperText?: ReactNode;
    step?: number;
    min?: number;
    max?: number;
    /** Decimal places shown, e.g. 1 -> "3.0". Default 1. */
    decimals?: number;
    id?: string;
    className?: string;
    /** Extra classes merged onto the input, e.g. to swap the focus ring color for a themed card. */
    inputClassName?: string;
    /** Extra classes on the input's wrapping div, e.g. to cap its width independently of the label/helper text. */
    inputWrapperClassName?: string;
}

export function PercentField({
    label,
    help,
    value,
    onChange,
    helperText,
    step,
    min,
    max,
    decimals = 1,
    id,
    className,
    inputClassName,
    inputWrapperClassName,
}: PercentFieldProps) {
    const autoId = useId();
    const inputId = id ?? autoId;

    return (
        <div className={className}>
            {label && (
                <label
                    htmlFor={inputId}
                    className={help ? 'flex items-center gap-2 text-sm font-medium mb-1' : 'block text-sm font-medium mb-1'}
                >
                    {label}
                    {help}
                </label>
            )}
            <div className={cn('relative', inputWrapperClassName)}>
                <input
                    id={inputId}
                    type="number"
                    value={(value * 100).toFixed(decimals)}
                    onChange={(e) => onChange(parseFloat(e.target.value) / 100 || 0)}
                    step={step}
                    min={min}
                    max={max}
                    className={cn('w-full pr-8 pl-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500', inputClassName)}
                />
                <span className="absolute right-3 top-2 text-gray-500">%</span>
            </div>
            {helperText && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}
        </div>
    );
}
