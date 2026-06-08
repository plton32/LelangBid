import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="mb-4 w-full">
        {label && (
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-4 py-3 bg-brand-navy-light text-slate-100 placeholder-slate-500 rounded-xl border border-slate-700/60 focus:outline-none focus:border-brand-accent-red/70 focus:ring-1 focus:ring-brand-accent-red/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'border-brand-accent-red focus:ring-brand-accent-red' : ''
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-brand-accent-red font-medium">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
