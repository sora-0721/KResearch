
import React from 'react';
import { Source } from '../types';
import { ChevronUpIcon, ChevronDownIcon } from './icons';

interface SourcesListViewProps {
  sources: Source[];
  isVisible: boolean;
  toggleVisibility: () => void;
}

const SourcesListView: React.FC<SourcesListViewProps> = ({ sources, isVisible, toggleVisibility }) => {
  return (
    <div>
      <button 
        onClick={toggleVisibility} 
        className="flex items-center justify-between w-full text-left py-2 px-3 bg-gray-700 hover:bg-gray-600 rounded-md text-lg font-semibold text-gray-300"
        aria-expanded={isVisible}
        aria-controls="sources-list-content"
      >
        All Sources ({sources.length})
        {isVisible ? <ChevronUpIcon /> : <ChevronDownIcon />}
      </button>
      {isVisible && (
        <div id="sources-list-content" className="mt-2 p-3 bg-gray-800 rounded-lg max-h-60 overflow-y-auto text-sm space-y-1">
          {sources.length > 0 ? sources.map(s => (
            <a 
              key={s.uri} 
              href={s.uri} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="block p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-blue-400 hover:underline truncate" 
              title={s.uri}
            >
              {s.title || s.uri}
            </a>
          )) : <p className="text-gray-400">No sources were cited during this research.</p>}
        </div>
      )}
    </div>
  );
};

export default SourcesListView;
