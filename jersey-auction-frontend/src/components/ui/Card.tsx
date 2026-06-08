import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverEffect = false,
  glow = false,
  className = '',
  ...props
}) => {
  const baseStyle = 'bg-brand-navy-light/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-premium transition-all duration-300';
  const hoverStyle = hoverEffect ? 'hover:-translate-y-1.5 hover:border-brand-gold/30 hover:shadow-premium-glow' : '';
  const glowStyle = glow ? 'shadow-premium-glow border-brand-gold/20' : '';

  return (
    <div
      className={`${baseStyle} ${hoverStyle} ${glowStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
export default Card;
