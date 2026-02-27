import React from 'react';
import { AlertCircle, ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { RiskAlert, AlertLevel } from '@/features/consultation/hooks/useClinicalGuard';
import { cn } from '@/lib/utils';

interface SafeguardsPanelProps {
    status: AlertLevel;
    alerts: RiskAlert[];
}

export function SafeguardsPanel({ status, alerts }: SafeguardsPanelProps) {
    if (status === 'safe' && alerts.length === 0) {
        return null;
    }

    // Styles based on severity
    const configMap = {
        high: {
            bg: 'bg-rose-50',
            border: 'border-rose-200',
            text: 'text-rose-700',
            icon: <ShieldAlert size={16} className="text-rose-600 animate-pulse" />
        },
        medium: {
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            text: 'text-amber-700',
            icon: <AlertTriangle size={16} className="text-amber-600" />
        },
        low: {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            text: 'text-blue-700',
            icon: <AlertCircle size={16} className="text-blue-600" />
        },
        safe: {
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            text: 'text-emerald-700',
            icon: <ShieldCheck size={16} className="text-emerald-600" />
        }
    };

    // Get config with fallback for invalid status
    const config = configMap[status as keyof typeof configMap] || configMap.safe;

    return (
        <div className={cn(
            "absolute -top-auto bottom-full left-0 right-0 mb-3 mx-1 z-10 rounded-xl border shadow-sm p-3 transition-all duration-300 animate-in slide-in-from-bottom-2",
            config.bg,
            config.border
        )}>
            <div className="flex items-start gap-3">
                <div className="mt-0.5">{config.icon}</div>
                <div className="flex-1 space-y-1">
                    {alerts.map(alert => (
                        <div key={alert.id} className={cn("text-xs font-semibold leading-relaxed", config.text)}>
                            {alert.message}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}