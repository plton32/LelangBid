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
    upcoming: 'bg-brand-accent/10 text-brand-accent border border-brand-accent/20',
    closed: 'bg-slate-800 text-slate-400 border border-slate-700/50',
    success: 'bg-brand-accent-green/15 text-brand-accent-green border border-brand-accent-green/30',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    info: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    gold: 'gold-gradient-bg text-brand-navy border border-brand-gold-dark/40 shadow-sm'
  };

  return (
    <span className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
export default Badge;
