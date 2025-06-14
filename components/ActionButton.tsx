
import React from 'react';

interface ActionButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  title?: string;
  isLoading?: boolean; // Added to match original usage pattern
}

const ActionButton: React.FC<ActionButtonProps> = ({ onClick, children, className, disabled, title, isLoading }) => (
  <button
    onClick={onClick}
    disabled={disabled || isLoading}
    title={title}
    className={`px-4 py-2 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-colors duration-150
                bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500
                disabled:bg-gray-500 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

export default ActionButton;
