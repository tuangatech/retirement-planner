// src/components/results/InsightCard.tsx
// Renders one Annual Breakdown insight (src/lib/insights.ts). Owns the icon-name -> lucide
// component mapping, since the icon a caller renders is a display concern, not something
// the pure insights module should hold.

import { AlertCircle, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import type { Insight, InsightIcon } from '@/lib/insights';

const ICONS: Record<InsightIcon, typeof AlertCircle> = {
    'alert-circle': AlertCircle,
    calendar: Calendar,
    'trending-up': TrendingUp,
    'dollar-sign': DollarSign,
};

export function InsightCard({ insight }: { insight: Insight }) {
    const colorClasses = {
        positive: 'bg-green-50 border-green-300 text-green-800',
        info: 'bg-blue-50 border-blue-300 text-blue-800',
        warning: 'bg-yellow-50 border-yellow-300 text-yellow-800',
        event: 'bg-purple-50 border-purple-300 text-purple-800',
    };

    const iconColorClasses = {
        positive: 'text-green-600',
        info: 'text-blue-600',
        warning: 'text-yellow-600',
        event: 'text-purple-600',
    };

    const Icon = ICONS[insight.icon];

    return (
        <div className={`border-l-4 ${colorClasses[insight.type]} rounded-r-lg p-4`}>
            <div className="flex items-start gap-3">
                <div className={iconColorClasses[insight.type]}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <div className="font-semibold mb-1">
                        {insight.title}
                        {insight.ageRange && (
                            <span className="ml-2 text-xs font-normal opacity-75">
                                {insight.ageRange}
                            </span>
                        )}
                    </div>
                    <div className="text-sm opacity-90">
                        {insight.description}
                    </div>
                </div>
            </div>
        </div>
    );
}
