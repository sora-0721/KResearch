
import React, { useState, useEffect } from 'react';
import ActionButton from '../ActionButton';
import { PencilIcon, PlayIcon }  from '../icons'; // Added PlayIcon
import { ResearchMode } from '../../types';

interface PhaseStrategyReviewProps {
  researchTopic: string;
  initialStrategy: string;
  researchMode: ResearchMode;
  maxIterations: number;
  handleProceedToActionReview: (updatedStrategy: string) => void;
  handleStartResearchDirectly: (updatedStrategy: string) => void; // New prop
  isLoading: boolean;
  onBackToClarifications: () => void;
}

const PhaseStrategyReview: React.FC<PhaseStrategyReviewProps> = ({
  researchTopic, initialStrategy, researchMode, maxIterations,
  handleProceedToActionReview, handleStartResearchDirectly, // Destructure new prop
  isLoading, onBackToClarifications
}) => {
  const [editableStrategy, setEditableStrategy] = useState<string>(initialStrategy);

  useEffect(() => {
    setEditableStrategy(initialStrategy);
  }, [initialStrategy]);

  const handleSubmitForReview = () => {
    handleProceedToActionReview(editableStrategy.trim());
  };

  const handleSubmitDirectly = () => {
    handleStartResearchDirectly(editableStrategy.trim());
  };

  return (
    <div className="space-y-6 p-2">
      <h2 className="text-2xl font-semibold text-center text-blue-300">Review Research Strategy</h2>
      <p className="text-gray-400"><span className="font-semibold text-gray-300">Topic:</span> {researchTopic}</p>
      
      <div className="p-3 bg-gray-700 rounded-md space-y-3">
        <div>
            <h3 className="text-md font-semibold text-gray-300 mb-1">Research Mode & Iterations:</h3>
            <p className="text-sm text-gray-400">Mode: <span className="capitalize font-medium">{researchMode}</span>, Max Iterations: {maxIterations}</p>
        </div>
        <div>
          <label htmlFor="strategy-textarea" className="block text-md font-semibold text-gray-300 mb-1">
            Proposed Strategy (Editable):
          </label>
          <textarea
            id="strategy-textarea"
            value={editableStrategy}
            onChange={(e) => setEditableStrategy(e.target.value)}
            className="w-full p-2 bg-gray-600 border border-gray-500 rounded-md focus:ring-1 focus:ring-blue-500 outline-none resize-y min-h-[120px]"
            rows={5}
            disabled={isLoading}
            aria-label="Editable research strategy"
          />
        </div>
      </div>
      
      <div className="space-y-3">
        <ActionButton 
          onClick={handleSubmitDirectly} 
          className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 focus:ring-green-500" // Primary button styling
          isLoading={isLoading} 
          disabled={isLoading || !editableStrategy.trim()}
          title="Start research immediately using AI's first proposed action without manual review."
        >
          <PlayIcon /> <span>Start Research Directly</span>
        </ActionButton>

        <ActionButton 
          onClick={handleSubmitForReview} 
          className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700" // Kept as blue, or make it secondary (e.g., gray)
          isLoading={isLoading} 
          disabled={isLoading || !editableStrategy.trim()}
          title="Proceed to review and potentially edit the AI's first proposed research action."
        >
          <PencilIcon /> <span>Review First Action & Proceed</span>
        </ActionButton>
      </div>

      <p className="text-xs text-gray-500 text-center mt-1">
        "Start Research Directly" uses the AI's first action. "Review First Action" lets you edit it.
      </p>
      <button 
        onClick={onBackToClarifications} 
        className="text-sm text-gray-400 hover:text-gray-300 w-full mt-2 disabled:text-gray-600" 
        disabled={isLoading}
      >
        Back to Clarifications
      </button>
    </div>
  );
};
export default PhaseStrategyReview;
