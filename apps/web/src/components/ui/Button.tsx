import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  className = "",
  ...props
}: ButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "secondary":
        return "bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark text-textPrimary-light dark:text-textPrimary-dark hover:bg-borderBase-light dark:hover:bg-borderBase-dark border border-borderBase-light dark:border-borderBase-dark";
      case "outline":
        return "bg-transparent text-textPrimary-light dark:text-textPrimary-dark border border-borderBase-light dark:border-borderBase-dark hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark";
      case "danger":
        return "bg-status-danger text-white hover:opacity-90 border border-status-danger";
      case "ghost":
        return "bg-transparent text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark border border-transparent";
      case "primary":
      default:
        return "bg-accent text-white hover:bg-accent-hover border border-accent shadow-sm";
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return "min-h-[28px] px-2.5 py-1 text-xs gap-1.5 rounded";
      case "lg":
        return "min-h-[40px] px-4 py-2 text-sm gap-2 rounded-md";
      case "md":
      default:
        return "min-h-[32px] px-3 py-1.5 text-xs gap-2 rounded";
    }
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none max-w-full min-w-0 select-none ${getVariantStyles()} ${getSizeStyles()} ${className}`}
      {...props}
    >
      {isLoading && (
        <span className="animate-spin mr-1.5 text-current shrink-0">◓</span>
      )}
      {!isLoading && leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>}
      <span className="truncate min-w-0">{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0 flex items-center">{rightIcon}</span>}
    </button>
  );
}
