// src/components/common/NumberField.tsx
// Plain number field (no $/% affix) with label, inline help, and helper text — the
// pattern repeated across the wizard screens' age/duration inputs.

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface NumberFieldProps {
    label?: ReactNode;
    help?: ReactNode;
    value: number;
    onChange: (value: number) => void;
    helperText?: ReactNode;
    step?: number;
    min?: number;
    max?: number;
    disabled?: boolean;
    id?: string;
    className?: string;
    /** Extra classes merged onto the input, e.g. to swap the focus ring color for a themed card. */
    inputClassName?: string;
}

export function NumberField({
    label,
    help,
    value,
    onChange,
    helperText,
    step,
    min,
    max,
    disabled,
    id,
    className,
    inputClassName,
}: NumberFieldProps) {
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
            <input
                id={inputId}
                type="number"
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                step={step}
                min={min}
                max={max}
                disabled={disabled}
                className={cn(
                    'w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500',
                    disabled && 'bg-gray-100 text-gray-500 cursor-not-allowed',
                    inputClassName
                )}
            />
            {helperText && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}
        </div>
    );
}
