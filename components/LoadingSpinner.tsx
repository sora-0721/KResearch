
import React from 'react';

const LoadingSpinner: React.FC<{ message?: string }> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      {message && <p className="text-blue-400">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;
