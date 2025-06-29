
import React from 'react';

interface LiquidButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

const LiquidButton: React.FC<LiquidButtonProps> = ({ children, className = '', ...props }) => {
  return (
    <button
      className={`
        px-6 py-3 rounded-xl 
        font-semibold text-gray-800 dark:text-gray-200
        bg-glass-light dark:bg-glass-dark
        border border-border-light dark:border-border-dark
        backdrop-blur-md
        shadow-md shadow-shadow-light dark:shadow-shadow-dark
        hover:shadow-lg hover:shadow-glow-light/50 dark:hover:shadow-glow-dark/50
        hover:border-glow-light dark:hover:border-glow-dark
        hover:-translate-y-0.5
        active:translate-y-0
        transition-all duration-300
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:-translate-y-0
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};

export default LiquidButton;
