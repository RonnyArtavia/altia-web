/**
 * OutputFooter - Reusable footer with 4 output buttons
 * Email, WhatsApp, Impreso (Print/PDF), Pantalla (Screen Preview)
 * Used in: OrdersPanel, ReferralsPanel, PharmacyPanel
 */

import React from 'react';
import { Mail, MessageCircle, Printer, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

export type OutputChannel = 'email' | 'whatsapp' | 'print' | 'screen';

interface OutputFooterProps {
  /** Called when user clicks an output button */
  onOutput: (channel: OutputChannel) => void;
  /** Optional label to contextualize the footer */
  label?: string;
  /** Disable all buttons */
  disabled?: boolean;
  /** Optional accent color theme */
  accentColor?: 'indigo' | 'purple' | 'emerald' | 'teal';
}

const CHANNEL_CONFIG: Record<OutputChannel, {
  label: string;
  icon: typeof Mail;
  description: string;
  color: string;
  hoverColor: string;
  iconColor: string;
  bgColor: string;
}> = {
  email: {
    label: 'Email',
    icon: Mail,
    description: 'Enviar por correo',
    color: 'border-blue-200',
    hoverColor: 'hover:bg-blue-50 hover:border-blue-300',
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: MessageCircle,
    description: 'Enviar por WhatsApp',
    color: 'border-green-200',
    hoverColor: 'hover:bg-green-50 hover:border-green-300',
    iconColor: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  print: {
    label: 'Impreso',
    icon: Printer,
    description: 'Imprimir / PDF',
    color: 'border-slate-200',
    hoverColor: 'hover:bg-slate-50 hover:border-slate-300',
    iconColor: 'text-slate-600',
    bgColor: 'bg-slate-100',
  },
  screen: {
    label: 'Pantalla',
    icon: Monitor,
    description: 'Vista previa',
    color: 'border-indigo-200',
    hoverColor: 'hover:bg-indigo-50 hover:border-indigo-300',
    iconColor: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
  },
};

const CHANNELS: OutputChannel[] = ['email', 'whatsapp', 'print', 'screen'];

export function OutputFooter({ onOutput, label, disabled = false, accentColor = 'indigo' }: OutputFooterProps) {
  const accentMap = {
    indigo: 'from-indigo-50 to-blue-50 border-indigo-100',
    purple: 'from-purple-50 to-indigo-50 border-purple-100',
    emerald: 'from-emerald-50 to-teal-50 border-emerald-100',
    teal: 'from-teal-50 to-cyan-50 border-teal-100',
  };

  return (
    <div className={cn(
      'bg-gradient-to-r rounded-2xl border p-4 shadow-sm mt-6',
      accentMap[accentColor]
    )}>
      {/* Label */}
      {label && (
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">
          {label}
        </p>
      )}

      {/* 4 Output Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {CHANNELS.map((channel) => {
          const cfg = CHANNEL_CONFIG[channel];
          const Icon = cfg.icon;
          return (
            <button
              key={channel}
              onClick={() => onOutput(channel)}
              disabled={disabled}
              className={cn(
                'flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border bg-white transition-all duration-200',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                cfg.color,
                cfg.hoverColor,
                'active:scale-[0.97] shadow-sm hover:shadow-md'
              )}
            >
              <div className={cn('p-2 rounded-lg', cfg.bgColor)}>
                <Icon className={cn('h-4 w-4', cfg.iconColor)} />
              </div>
              <span className="text-xs font-semibold text-slate-700">{cfg.label}</span>
              <span className="text-[9px] text-slate-400 hidden sm:block">{cfg.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
