
import React, { useState, useEffect } from 'react';
import ActionButton from '../ActionButton';
import { PlayIcon, PencilIcon } from '../icons';
import { ProposedActionDetails, ResearchMode } from '../../types';
import LoadingSpinner from '../LoadingSpinner';

interface PhaseActionReviewProps {
  researchTopic: string;
  researchStrategy: string;
  proposedAction: ProposedActionDetails;
  maxIterations: number;
  researchMode: ResearchMode;
  isLoading: boolean;
  handleExecuteInitialActionAndProceed: (action: string, reason: string) => void;
  onBackToStrategy: () => void;
}

const PhaseActionReview: React.FC<PhaseActionReviewProps> = ({
  researchTopic, researchStrategy, proposedAction, maxIterations, researchMode,
  isLoading, handleExecuteInitialActionAndProceed, onBackToStrategy
}) => {
  const [editableAction, setEditableAction] = useState<string>(proposedAction.action);

  useEffect(() => {
    setEditableAction(proposedAction.action);
  }, [proposedAction.action]);

  const handleSubmit = () => {
    // Pass the potentially edited action, but the original AI reason
    handleExecuteInitialActionAndProceed(editableAction.trim(), proposedAction.reason);
  };

  if (isLoading && !proposedAction) { // Handles loading state if App.tsx sets isLoading before proposedAction is ready
      return <LoadingSpinner message="Deciding first research action..." />;
  }
  
  return (
    <div className="space-y-6 p-2">
      <h2 className="text-2xl font-semibold text-center text-blue-300">Review First Research Action</h2>
      <p className="text-gray-400"><span className="font-semibold text-gray-300">Topic:</span> {researchTopic}</p>
      
      <div className="p-3 bg-gray-700 rounded-md space-y-3">
        <div>
            <h3 className="text-md font-semibold text-gray-300 mb-1">Research Mode & Iterations:</h3>
            <p className="text-sm text-gray-400">Mode: <span className="capitalize font-medium">{researchMode}</span>, Max Iterations: {maxIterations}</p>
        </div>
        <div>
          <h3 className="text-md font-semibold text-gray-300 mb-1">Overall Strategy:</h3>
          <p className="text-sm text-gray-400 whitespace-pre-wrap max-h-20 overflow-y-auto">{researchStrategy}</p>
        </div>
        <div>
          <h3 className="text-md font-semibold text-gray-300 mb-1">AI's Proposed First Action:</h3>
          <textarea
            value={editableAction}
            onChange={(e) => setEditableAction(e.target.value)}
            className="w-full p-2 bg-gray-600 border border-gray-500 rounded-md focus:ring-1 focus:ring-blue-500 outline-none resize-y min-h-[80px]"
            rows={3}
            disabled={isLoading}
            aria-label="Editable first research action"
          />
        </div>
        <div>
          <h3 className="text-md font-semibold text-gray-300 mb-1">AI's Reasoning for this Action:</h3>
          <p className="text-sm text-gray-400">{proposedAction.reason}</p>
        </div>
        {proposedAction.shouldStop && (
            <p className="text-sm text-yellow-400 bg-yellow-900 bg-opacity-30 p-2 rounded-md">
                Note: The AI suggests that research might conclude quickly based on this first step or current information. You can still proceed.
            </p>
        )}
      </div>
      
      <ActionButton 
        onClick={handleSubmit} 
        className="w-full flex items-center justify-center space-x-2" 
        isLoading={isLoading}
        disabled={isLoading || !editableAction.trim()}
      >
        <PlayIcon /> <span>Execute this Action & Start Research</span>
      </ActionButton>
      
      <button 
        onClick={onBackToStrategy} 
        className="text-sm text-gray-400 hover:text-gray-300 w-full mt-2 disabled:text-gray-600" 
        disabled={isLoading}
      >
        Back to Strategy Review
      </button>
    </div>
  );
};
export default PhaseActionReview;
