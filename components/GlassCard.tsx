import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`
        bg-card-bg-light dark:bg-glass-dark 
        backdrop-blur-[25px]
        border border-border-light dark:border-border-dark 
        rounded-2xl 
        shadow-glass shadow-shadow-light dark:shadow-shadow-dark
        transition-all duration-300
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default GlassCard;