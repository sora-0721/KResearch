
import React from 'react';

interface LiquidButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

const LiquidButton: React.FC<LiquidButtonProps> = ({ children, className = '', ...props }) => {
  return (
    <button
      className={`
        px-6 py-3 rounded-[10px] 
        font-semibold text-gray-800 dark:text-gray-200
        bg-glass-light/70 dark:bg-glass-dark/70
        border border-border-light dark:border-border-dark
        backdrop-blur-md
        hover:shadow-glass hover:shadow-shadow-light dark:hover:shadow-shadow-dark
        hover:border-glow-light dark:hover:border-glow-dark
        hover:bg-glass-light dark:hover:bg-glass-dark
        hover:-translate-y-1
        active:translate-y-px
        transition-all duration-300
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:-translate-y-0 disabled:hover:bg-glass-light/70 dark:disabled:hover:bg-glass-dark/70
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};

export default LiquidButton;
