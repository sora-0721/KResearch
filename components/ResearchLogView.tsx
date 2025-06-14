
import React from 'react';
import { ResearchLogEntry } from '../types';

interface ResearchLogViewProps {
  logEntries: ResearchLogEntry[];
  title?: string;
  className?: string;
  entryClassName?: string;
  compact?: boolean; // For smaller display in non-execution phases
}

const ResearchLogView: React.FC<ResearchLogViewProps> = ({ logEntries, title, className, entryClassName, compact }) => {
  if (!logEntries || logEntries.length === 0) {
    return null; 
  }

  const getBorderColor = (type: ResearchLogEntry['type']) => {
    switch (type) {
      case 'error': return 'border-red-500 bg-red-900 bg-opacity-30';
      case 'thought': return 'border-purple-500 bg-purple-900 bg-opacity-20';
      case 'action': return 'border-yellow-500 bg-yellow-900 bg-opacity-20';
      case 'summary': return 'border-green-500 bg-green-900 bg-opacity-20';
      case 'sources': return 'border-teal-500 bg-teal-900 bg-opacity-20';
      case 'clarification_q': return 'border-cyan-500 bg-cyan-900 bg-opacity-20';
      case 'clarification_a': return 'border-indigo-500 bg-indigo-900 bg-opacity-20';
      default: return 'border-gray-600';
    }
  };

  const getTextColor = (type: ResearchLogEntry['type']) => {
    const baseColors = compact ? 'text-gray-300' : 'text-gray-300';
    switch (type) {
      case 'error': return compact ? 'text-red-400' : 'text-red-400';
      case 'thought': return compact ? 'text-purple-300' : 'text-purple-400';
      case 'action': return compact ? 'text-yellow-300' : 'text-yellow-400';
      case 'summary': return compact ? 'text-green-300' : 'text-green-400';
      case 'sources': return compact ? 'text-teal-300' : 'text-teal-400';
      case 'clarification_q': return compact ? 'text-cyan-300' : 'text-cyan-400';
      case 'clarification_a': return compact ? 'text-indigo-300' : 'text-indigo-400';
      default: return baseColors;
    }
  };
  
  const pClass = compact ? 'p-1 rounded border-l-2' : 'mb-2 p-1.5 rounded-md border-l-4';
  const timeClass = compact ? 'text-gray-500 mr-1.5' : 'text-xs text-gray-500 mr-2';
  const typeClass = compact ? 'font-medium' : 'font-semibold';
  const contentClass = compact ? 'ml-1 text-gray-300 whitespace-pre-wrap break-words' : 'ml-1 text-gray-300 whitespace-pre-wrap break-words';
  const sourceLinkClass = compact ? 'block text-blue-400 hover:underline truncate text-[0.9em]' : 'block text-blue-400 hover:underline truncate';


  return (
    <div className={className || (compact ? "mt-2 p-1 bg-gray-900 bg-opacity-50 rounded max-h-96 overflow-y-auto text-xs space-y-1.5" : "mt-4 p-3 bg-gray-800 rounded-lg max-h-[60vh] overflow-y-auto text-sm")}>
      {title && <h3 className={`font-semibold text-gray-300 mb-2 sticky top-0 py-1 z-10 ${compact ? 'text-base bg-gray-800' : 'text-lg bg-gray-800'}`}>{title}</h3>}
      {logEntries.map((log) => (
        <div key={log.id} className={`${pClass} ${getBorderColor(log.type)} ${entryClassName || ''}`}>
          <span className={timeClass}>{new Date(log.timestamp).toLocaleTimeString()}</span>
          <span className={`${typeClass} ${getTextColor(log.type)}`}>
            {log.type.replace(/_/g, ' ').toUpperCase()}:
          </span>
          <span className={contentClass}>{log.content}</span>
          {log.type === 'sources' && log.sources && log.sources.length > 0 && (
            <div className={compact ? "mt-0.5 pl-3" : "mt-1 pl-4 text-xs"}>
              {log.sources.map(s => (
                <a key={s.uri} href={s.uri} target="_blank" rel="noopener noreferrer" className={sourceLinkClass}>
                  - {s.title || s.uri}
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ResearchLogView;
