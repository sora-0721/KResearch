
import React from 'react';
import ActionButton from '../ActionButton';
import { ArrowPathIcon } from '../icons';

interface PhaseErrorProps {
  error: string | null;
  resetState: () => void;
}

const PhaseError: React.FC<PhaseErrorProps> = ({ error, resetState }) => {
  return (
    <div className="space-y-6 p-4 text-center">
      <h2 className="text-2xl font-semibold text-red-400">An Error Occurred</h2>
      <p className="text-gray-300 bg-red-900 bg-opacity-50 p-3 rounded-md whitespace-pre-wrap">{error}</p>
      <ActionButton onClick={resetState} className="w-full sm:w-auto flex items-center justify-center space-x-2">
        <ArrowPathIcon className="w-5 h-5"/> <span>Start Over</span>
      </ActionButton>
    </div>
  );
};
export default PhaseError;
