
import React from 'react';
import ActionButton from '../ActionButton';
import { PencilIcon } from '../icons';
import { ResearchMode } from '../../types';
import { DEFAULT_MAX_ITERATIONS } from '../../utils/appConstants';

interface PhaseInputProps {
  researchTopic: string;
  setResearchTopic: (topic: string) => void;
  researchMode: ResearchMode;
  setResearchMode: (mode: ResearchMode) => void;
  maxIterations: number;
  setMaxIterations: (iterations: number) => void;
  handleTopicSubmit: () => void;
  isLoading: boolean;
}

const PhaseInput: React.FC<PhaseInputProps> = ({
  researchTopic, setResearchTopic, researchMode, setResearchMode,
  maxIterations, setMaxIterations, handleTopicSubmit, isLoading
}) => {
  return (
    <div className="space-y-6 p-2">
      <h2 className="text-2xl font-semibold text-center text-blue-300">Enter Your Research Topic</h2>
      <textarea
        value={researchTopic}
        onChange={(e) => setResearchTopic(e.target.value)}
        placeholder="e.g., The future of decentralized finance (DeFi)"
        className="w-full h-32 p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
        disabled={isLoading}
        aria-label="Research Topic Input"
      />
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-300">Research Mode:</label>
          <div className="flex space-x-4 mt-1">
            {(['normal', 'deeper'] as ResearchMode[]).map(mode => (
              <label key={mode} className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="researchMode" value={mode} checked={researchMode === mode}
                  onChange={() => setResearchMode(mode)}
                  className="form-radio h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                  disabled={isLoading} />
                <span className="text-gray-300 capitalize">{mode} Mode</span>
              </label>
            ))}
          </div>
          {researchMode === 'deeper' && <p className="text-xs text-gray-500 mt-1">Deeper mode uses the recommended model for higher quality analysis.</p>}
        </div>
        <div>
          <label htmlFor="max-iterations" className="block text-sm font-medium text-gray-300">Maximum Research Iterations:</label>
          <input type="number" id="max-iterations" value={maxIterations}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) setMaxIterations(Math.max(1, Math.min(500, val)));
              else if (e.target.value === '') setMaxIterations(0); // Temp state for empty input
            }}
            onBlur={() => { if (maxIterations === 0 || isNaN(maxIterations)) setMaxIterations(DEFAULT_MAX_ITERATIONS);}}
            min="1" max="500"
            className="mt-1 w-24 p-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-600"
            disabled={isLoading} aria-label="Maximum Research Iterations" />
          <p className="text-xs text-gray-500 mt-1">Defines AI research steps (1-500).</p>
        </div>
      </div>
      <ActionButton onClick={handleTopicSubmit} className="w-full flex items-center justify-center space-x-2"
        disabled={isLoading || !researchTopic.trim() || maxIterations < 1 || maxIterations > 500}
        isLoading={isLoading}>
        <PencilIcon /> <span>Next: Clarify Topic</span>
      </ActionButton>
    </div>
  );
};
export default PhaseInput;
