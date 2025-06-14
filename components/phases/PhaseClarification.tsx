
import React from 'react';
import ActionButton from '../ActionButton';
import { SendIcon, PlayIcon } from '../icons';
import { ClarificationQuestion } from '../../types';

interface PhaseClarificationProps {
  researchTopic: string;
  clarificationQuestions: ClarificationQuestion[];
  userAnswers: Record<number, string>;
  setUserAnswers: (answers: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void;
  handleAnswersSubmit: () => void;
  handleSkipClarification: () => void;
  isLoading: boolean;
  clarificationRound: number;
  onBackToTopic: () => void;
}

const PhaseClarification: React.FC<PhaseClarificationProps> = ({
  researchTopic, clarificationQuestions, userAnswers, setUserAnswers,
  handleAnswersSubmit, handleSkipClarification, isLoading, clarificationRound, onBackToTopic
}) => {
  return (
    <div className="space-y-6 p-2">
      <h2 className="text-2xl font-semibold text-center text-blue-300">Clarify Research Focus (Round {clarificationRound})</h2>
      <p className="text-gray-400"><span className="font-semibold text-gray-300">Topic:</span> {researchTopic}</p>
      <div className="space-y-4 max-h-96 overflow-y-auto p-1">
        {clarificationQuestions.map(q => (
          <div key={q.id} className="p-3 bg-gray-700 rounded-md">
            <label htmlFor={`q-${q.id}`} className="block text-sm font-medium text-gray-300 mb-1">{q.question}</label>
            <textarea id={`q-${q.id}`} value={userAnswers[q.id] || ''}
              onChange={(e) => setUserAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
              placeholder="Your answer..."
              className="w-full p-2 bg-gray-600 border border-gray-500 rounded-md focus:ring-1 focus:ring-blue-500 outline-none resize-y min-h-[60px]"
              rows={2} disabled={isLoading} aria-label={`Answer to: ${q.question}`} />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <ActionButton onClick={handleAnswersSubmit} className="w-full flex items-center justify-center space-x-2"
          disabled={isLoading || clarificationQuestions.some(q => !(userAnswers[q.id]?.trim()))}
          isLoading={isLoading}>
          <SendIcon /> <span>Submit Answers & Proceed</span>
        </ActionButton>
        <ActionButton onClick={handleSkipClarification}
          className="w-full flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-500 focus:ring-gray-400"
          disabled={isLoading} isLoading={isLoading}>
          <PlayIcon className="w-5 h-5"/> <span>Skip & Generate Strategy</span>
        </ActionButton>
      </div>
      <button onClick={onBackToTopic} className="text-sm text-gray-400 hover:text-gray-300 w-full mt-2 disabled:text-gray-600" disabled={isLoading}>
        Back to Topic
      </button>
    </div>
  );
};
export default PhaseClarification;
