import * as React from "react";
import { cn } from "@/src/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && <label className="text-xs font-medium text-white/60 uppercase tracking-wider">{label}</label>}
        <input
          type={type}
          className={cn(
            "flex h-12 w-full border border-white/10 bg-white/5 px-4 py-2 text-sm transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-white/20 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-[10px] text-red-500 uppercase tracking-tight">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string; value: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && <label className="text-xs font-medium text-white/60 uppercase tracking-wider">{label}</label>}
        <select
          ref={ref}
          className={cn(
            "flex h-12 w-full border border-white/10 bg-white/5 px-4 py-2 text-sm transition-all focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50 appearance-none",
            error && "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20",
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-black text-white">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-[10px] text-red-500 uppercase tracking-tight">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
