import { useState } from 'react';
import sastriaAvatar from '@/assets/sastria-avatar.png';
import { cn } from '@/lib/utils';
import { SastrIALogo } from '@/components/SastrIALogo';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Shield, Brain, BarChart3, Handshake } from 'lucide-react';

interface SastrIAAvatarProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  pulse?: boolean;
  glow?: boolean;
  clickable?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24',
};

const capabilities = [
  { icon: BarChart3, label: 'Oportunidades de Saving', desc: 'Identifica desperdícios, economias potenciais e simplificações no seu tenant' },
  { icon: Brain, label: 'Benchmark de Mercado', desc: 'Compara seu ambiente com práticas do mercado' },
  { icon: Shield, label: 'Compliance de Licenciamento', desc: 'Garante conformidade com políticas e contratos Microsoft' },
  { icon: Handshake, label: 'Assessoria', desc: 'Me peça ajuda como faria com um especialista' },
];

function AvatarImage({ size, pulse, glow, clickable }: Pick<SastrIAAvatarProps, 'size' | 'pulse' | 'glow' | 'clickable'>) {
  return (
    <img
      src={sastriaAvatar}
      alt="SastrIA"
      className={cn(
        'relative rounded-full object-cover ring-2 ring-primary/20',
        sizeClasses[size || 'sm'],
        pulse && 'animate-pulse',
        glow && 'ring-primary/40 shadow-[0_0_20px_hsl(var(--primary)/0.3)]',
        clickable && 'cursor-pointer hover:ring-primary/50 hover:scale-105 transition-all duration-200',
      )}
    />
  );
}

export function SastrIAAvatar({ size = 'sm', pulse = false, glow = false, clickable = false, className }: SastrIAAvatarProps) {
  const avatarWrapper = (
    <div className={cn('relative shrink-0', className)}>
      {glow && (
        <div className={cn('absolute inset-0 rounded-full bg-primary/30 blur-xl animate-pulse', sizeClasses[size])} />
      )}
      <AvatarImage size={size} pulse={pulse} glow={glow} clickable={clickable} />
    </div>
  );

  if (!clickable) return avatarWrapper;

  return (
    <Dialog>
      <DialogTrigger asChild>
        {avatarWrapper}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-0 gap-0 bg-background border-border overflow-hidden">
        {/* Header com avatar e info */}
        <div className="relative px-6 pt-8 pb-6 text-center border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl scale-150" />
              <img
                src={sastriaAvatar}
                alt="SastrIA"
                className="relative h-20 w-20 rounded-full object-cover ring-2 ring-primary/30 shadow-[0_0_30px_hsl(var(--primary)/0.2)]"
              />
              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 ring-2 ring-background flex items-center justify-center">
                <span className="text-[8px] text-white font-bold">ON</span>
              </div>
            </div>
            <h2 className="text-lg font-semibold">
              <SastrIALogo className="text-lg" />
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Agente de Governança Microsoft 365
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-400">Online e pronta para ajudar</span>
            </div>
          </div>
        </div>

        {/* Capacidades */}
        <div className="px-6 py-5 space-y-3">
          <p className="text-xs text-muted-foreground/70 uppercase tracking-wider font-medium">O que posso fazer</p>
          <div className="grid gap-2.5">
            {capabilities.map((cap) => (
              <div key={cap.label} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="shrink-0 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <cap.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground leading-tight">{cap.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{cap.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/10">
          <p className="text-[11px] text-muted-foreground/50 text-center">
            Powered by IA generativa · Dados do seu tenant Microsoft 365
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
