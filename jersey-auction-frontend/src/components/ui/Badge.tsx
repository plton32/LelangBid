import React from 'react';

interface BadgeProps {
  variant?: 'live' | 'upcoming' | 'closed' | 'success' | 'warning' | 'danger' | 'info' | 'gold';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'info',
  className = ''
}) => {
  const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300';
  
  const variants = {
    live: 'bg-brand-accent-red/15 text-brand-accent-red border border-brand-accent-red/30 animate-pulse',
    upcoming: 'bg-brand-accent-red/10 text-red-200 border border-brand-accent-red/25',
    closed: 'bg-slate-800 text-slate-400 border border-slate-700/50',
    success: 'bg-brand-accent-green/15 text-brand-accent-green border border-brand-accent-green/30',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    info: 'bg-brand-accent-red/10 text-red-200 border border-brand-accent-red/20',
    gold: 'bg-brand-gold/10 text-brand-gold border border-brand-gold/25 shadow-sm'
  };

  return (
    <span className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
export default Badge;
