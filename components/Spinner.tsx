import React from 'react';

const Spinner: React.FC = () => {
  return (
    <div className="w-5 h-5 border-2 border-glass-light/50 dark:border-glass-dark/50 border-t-gray-800 dark:border-t-gray-200 rounded-full animate-spin" role="status">
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default Spinner;