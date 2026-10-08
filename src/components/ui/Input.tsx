import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/src/lib/utils";
import { ChevronDown, Check } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type, style, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && <label className="text-xs font-medium text-white/60 uppercase tracking-wider">{label}</label>}
        <input
          type={type}
          style={{ colorScheme: "dark", ...style }}
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

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  label?: string;
  error?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  options: SelectOption[];
  className?: string;
  onChange?: (e: { target: { name?: string; value: string } }) => void;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
}

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  ({ className, label, error, options, name, value, defaultValue, disabled, onChange, onBlur }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Controlled or uncontrolled
    const selectedValue = value !== undefined ? value : defaultValue || "";
    const selectedOption = options.find((opt) => opt.value === selectedValue) || options[0];

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
      }
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [isOpen]);

    const handleSelect = (val: string) => {
      if (disabled) return;
      if (onChange) {
        onChange({ target: { name, value: val } });
      }
      setIsOpen(false);
    };

    return (
      <div className="w-full space-y-1.5" ref={containerRef}>
        {label && <label className="text-xs font-medium text-white/60 uppercase tracking-wider">{label}</label>}
        <div className="relative">
          <button
            ref={ref}
            type="button"
            name={name}
            disabled={disabled}
            onBlur={onBlur}
            onClick={() => !disabled && setIsOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            className={cn(
              "flex h-12 w-full items-center justify-between border border-white/10 bg-white/5 px-4 py-2 text-sm text-left transition-all",
              "focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20",
              disabled && "cursor-not-allowed opacity-50",
              error && "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20",
              isOpen && "border-cyan-500/50 ring-1 ring-cyan-500/20 bg-white/[0.08]",
              className
            )}
          >
            <span className={cn("truncate", !selectedValue && "text-white/40")}>
              {selectedOption?.label || "Select..."}
            </span>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-white/40 shrink-0 transition-transform duration-200",
                isOpen && "rotate-180 text-cyan-400"
              )}
            />
          </button>

          {isOpen && (
            <div
              role="listbox"
              className="absolute top-full left-0 z-50 mt-1.5 w-full max-h-60 overflow-y-auto border border-white/15 bg-neutral-900/98 shadow-[0_15px_35px_rgba(0,0,0,0.85)] backdrop-blur-xl"
            >
              <div className="py-1">
                {options.map((opt) => {
                  const isSelected = opt.value === selectedValue;
                  const isPlaceholder = opt.value === "";
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(opt.value)}
                      className={cn(
                        "flex w-full items-center justify-between px-4 py-3 text-sm text-left transition-colors cursor-pointer border-b border-white/[0.03] last:border-0",
                        isSelected
                          ? "bg-cyan-500/15 text-cyan-400 font-semibold"
                          : "text-white/80 hover:bg-white/10 hover:text-white",
                        isPlaceholder && "text-white/40 italic font-normal"
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && !isPlaceholder && (
                        <Check className="w-4 h-4 text-cyan-400 shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {error && <p className="text-[10px] text-red-500 uppercase tracking-tight">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
