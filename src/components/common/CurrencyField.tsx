// src/components/common/CurrencyField.tsx
// "$"-prefixed number field with optional suffix (e.g. "/mo"), label, inline help, and
// helper text — the pattern repeated across the wizard screens' currency inputs.
//
// Built on a plain <input> rather than components/ui/input.tsx: that primitive's default
// theme (--ring, --input in index.css) is a neutral black/gray shadcn theme the app never
// adopted, while every wizard field uses a blue-500 focus ring. Composing on it here would
// mean overriding its height, shadow, background, and ring color/width just to get back to
// the look already in use — not worth the risk for this migration.

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CurrencyFieldProps {
    label?: string;
    help?: ReactNode;
    value: number;
    onChange: (value: number) => void;
    suffix?: string;
    helperText?: ReactNode;
    step?: number;
    min?: number;
    id?: string;
    className?: string;
    /** Extra classes merged onto the input, e.g. to swap the focus ring color for a themed card. */
    inputClassName?: string;
}

export function CurrencyField({
    label,
    help,
    value,
    onChange,
    suffix,
    helperText,
    step,
    min = 0,
    id,
    className,
    inputClassName,
}: CurrencyFieldProps) {
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
            <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                    id={inputId}
                    type="number"
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                    step={step}
                    min={min}
                    className={cn(
                        'w-full pl-7 py-2 border rounded-md focus:ring-2 focus:ring-blue-500',
                        suffix ? 'pr-10' : 'pr-3',
                        inputClassName
                    )}
                />
                {suffix && <span className="absolute right-3 top-2 text-gray-500">{suffix}</span>}
            </div>
            {helperText && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}
        </div>
    );
}
