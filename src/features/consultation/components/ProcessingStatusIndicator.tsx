/**
 * ProcessingStatusIndicator - Claude Code-inspired dynamic status indicator
 *
 * Shows contextual processing messages with smooth transitions
 * Mimics the Claude Code CLI style with monospace font and subtle colors
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export type ProcessingPhase =
    | 'idle'
    | 'transcribing'
    | 'preprocessing'
    | 'extracting'
    | 'analyzing'
    | 'generating'
    | 'waiting';

interface ProcessingStatusIndicatorProps {
    isProcessing: boolean;
    phase?: ProcessingPhase;
    customMessage?: string;
    className?: string;
}

// Claude Code-style status messages
const PHASE_MESSAGES: Record<ProcessingPhase, string> = {
    idle: '',
    transcribing: 'Escuchando transcripción...',
    preprocessing: 'Filtrando contenido médico...',
    extracting: 'Extrayendo datos clínicos...',
    analyzing: 'Analizando información médica...',
    generating: 'Generando nota SOAP...',
    waiting: 'Esperando respuesta del servidor...',
};

// Sequential processing messages (exact steps from original)
const DEFAULT_MESSAGES = [
    'Escuchando transcripción...',
    'Filtrando contenido médico...',
    'Extrayendo datos clínicos...',
    'Analizando información médica...',
    'Generando nota SOAP...',
    'Finalizando procesamiento...'
];

export function ProcessingStatusIndicator({
    isProcessing,
    phase = 'idle',
    customMessage,
    className,
}: ProcessingStatusIndicatorProps) {
    const [displayMessage, setDisplayMessage] = useState('');
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [messageIndex, setMessageIndex] = useState(0);

    // Auto-rotate through messages when processing and no specific phase
    useEffect(() => {
        if (!isProcessing) {
            setDisplayMessage('');
            return;
        }

        if (customMessage) {
            setDisplayMessage(customMessage);
            return;
        }

        if (phase !== 'idle') {
            setDisplayMessage(PHASE_MESSAGES[phase]);
            return;
        }

        // Auto-rotate default messages - slower for better UX
        const intervalId = setInterval(() => {
            setIsTransitioning(true);
            setTimeout(() => {
                setMessageIndex((prev) => (prev + 1) % DEFAULT_MESSAGES.length);
                setIsTransitioning(false);
            }, 200); // Half of transition duration
        }, 1500); // More realistic timing for AI processing steps

        return () => clearInterval(intervalId);
    }, [isProcessing, phase, customMessage]);

    // Update display message when index changes
    useEffect(() => {
        if (isProcessing && phase === 'idle' && !customMessage) {
            setDisplayMessage(DEFAULT_MESSAGES[messageIndex] || '');
        }
    }, [messageIndex, isProcessing, phase, customMessage]);

    if (!isProcessing) return null;

    return (
        <div
            className={cn(
                'flex items-center gap-2.5',
                className
            )}
        >
            {/* Claude Code-style spinner - subtle pulsing dot */}
            <div className="flex items-center gap-1">
                <span
                    className="inline-block w-2 h-2 rounded-full bg-amber-500/80 animate-pulse"
                    style={{ animationDuration: '1s' }}
                />
            </div>

            {/* Status text with Claude Code typography */}
            <span
                className={cn(
                    'font-mono text-sm tracking-tight transition-all duration-300',
                    'text-slate-500 dark:text-slate-400',
                    isTransitioning ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
                )}
            >
                {displayMessage}
            </span>

            {/* Animated ellipsis */}
            <span className="font-mono text-slate-400 dark:text-slate-500">
                <span className="inline-block animate-pulse" style={{ animationDelay: '0ms' }}>.</span>
                <span className="inline-block animate-pulse" style={{ animationDelay: '200ms' }}>.</span>
                <span className="inline-block animate-pulse" style={{ animationDelay: '400ms' }}>.</span>
            </span>
        </div>
    );
}

export default ProcessingStatusIndicator;