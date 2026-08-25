import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type BaseFieldProps = {
  label: string;
  hint?: string;
};

type TextFieldProps = BaseFieldProps &
  InputHTMLAttributes<HTMLInputElement> & {
    name: string;
  };

type TextareaFieldProps = BaseFieldProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    name: string;
  };

type SelectFieldProps = BaseFieldProps &
  SelectHTMLAttributes<HTMLSelectElement> & {
    name: string;
    options: Array<{ label: string; value: string }>;
  };

export function TextField({ label, hint, className, ...props }: TextFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[var(--tx-text)]">{label}</span>
      <input
        className={cn(
          "mt-2 h-11 w-full rounded-lg border border-[var(--tx-border)] bg-white px-3 text-sm text-[var(--tx-text)] outline-none transition placeholder:text-[var(--tx-text-subtle)] focus:border-[var(--tx-accent)] focus:ring-3 focus:ring-[var(--tx-accent)]/15",
          className,
        )}
        {...props}
      />
      {hint ? <span className="mt-2 block text-xs text-[var(--tx-text-muted)]">{hint}</span> : null}
    </label>
  );
}

export function TextareaField({
  label,
  hint,
  className,
  ...props
}: TextareaFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[var(--tx-text)]">{label}</span>
      <textarea
        className={cn(
          "mt-2 min-h-28 w-full rounded-lg border border-[var(--tx-border)] bg-white px-3 py-3 text-sm text-[var(--tx-text)] outline-none transition placeholder:text-[var(--tx-text-subtle)] focus:border-[var(--tx-accent)] focus:ring-3 focus:ring-[var(--tx-accent)]/15",
          className,
        )}
        {...props}
      />
      {hint ? <span className="mt-2 block text-xs text-[var(--tx-text-muted)]">{hint}</span> : null}
    </label>
  );
}

export function SelectField({
  label,
  hint,
  options,
  className,
  ...props
}: SelectFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[var(--tx-text)]">{label}</span>
      <select
        className={cn(
          "mt-2 h-11 w-full rounded-lg border border-[var(--tx-border)] bg-white px-3 text-sm text-[var(--tx-text)] outline-none transition focus:border-[var(--tx-accent)] focus:ring-3 focus:ring-[var(--tx-accent)]/15",
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? <span className="mt-2 block text-xs text-[var(--tx-text-muted)]">{hint}</span> : null}
    </label>
  );
}
