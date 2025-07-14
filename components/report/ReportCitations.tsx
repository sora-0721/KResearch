import React from 'react';
import { Citation } from '../../types';

interface ReportCitationsProps {
  citations: Citation[];
}

const ReportCitations: React.FC<ReportCitationsProps> = ({ citations }) => {
  if (citations.length === 0) return null;

  return (
    <div className="mt-8 border-t border-border-light dark:border-border-dark pt-6">
      <h3 className="text-2xl font-bold mb-4">Citations</h3>
      <ul className="list-none p-0 space-y-2">
        {citations.map((citation, index) => (
          <li key={index} className="text-sm p-3 bg-glass-light dark:bg-glass-dark rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
            <a href={citation.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline transition-colors font-medium break-words">
              {citation.title || citation.url}
            </a>
            <span className="text-gray-500 dark:text-gray-400 block text-xs mt-1 break-all">{citation.url}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ReportCitations;