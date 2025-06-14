
import React from 'react';
import ActionButton from '../ActionButton';
import { PlayIcon } from '../icons';
import { ResearchMode } from '../../types';

interface PhaseStrategyReviewProps {
  researchTopic: string;
  researchStrategy: string;
  researchMode: ResearchMode;
  maxIterations: number;
  handleStartIterativeResearch: () => void;
  isLoading: boolean;
  onBackToClarifications: () => void;
}

const PhaseStrategyReview: React.FC<PhaseStrategyReviewProps> = ({
  researchTopic, researchStrategy, researchMode, maxIterations,
  handleStartIterativeResearch, isLoading, onBackToClarifications
}) => {
  return (
    <div className="space-y-6 p-2">
      <h2 className="text-2xl font-semibold text-center text-blue-300">Review Research Strategy</h2>
      <p className="text-gray-400"><span className="font-semibold text-gray-300">Topic:</span> {researchTopic}</p>
      <div className="p-3 bg-gray-700 rounded-md">
        <h3 className="text-md font-semibold text-gray-300 mb-1">Proposed Strategy:</h3>
        <p className="text-gray-400 whitespace-pre-wrap">{researchStrategy}</p>
      </div>
      <ActionButton onClick={handleStartIterativeResearch} className="w-full flex items-center justify-center space-x-2" isLoading={isLoading} disabled={isLoading}>
        <PlayIcon /> <span>Start Deep Research ({researchMode} mode, {maxIterations} iter.)</span>
      </ActionButton>
      <button onClick={onBackToClarifications} className="text-sm text-gray-400 hover:text-gray-300 w-full mt-2 disabled:text-gray-600" disabled={isLoading}>
        Back to Clarifications
      </button>
    </div>
  );
};
export default PhaseStrategyReview;
