import React, { useState } from 'react';
import { HistoryItem } from '../types';
import GlassCard from './GlassCard';
import LiquidButton from './LiquidButton';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, onClose, history, onLoad, onDelete, onClear }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = history.filter(item =>
    item.query.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`fixed inset-0 z-50 transition-all duration-500 ease-in-out ${isOpen ? 'visible' : 'invisible'}`}>
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-md transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      ></div>

      {/* Panel */}
      <GlassCard 
        className={`
          absolute top-0 right-0 h-full w-full max-w-md flex flex-col p-0 bg-slate-100/90
          transition-transform duration-500 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <header className="flex flex-col gap-4 p-6 shrink-0 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Research History</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title="Close">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search history..."
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-white/40 dark:bg-black/20 border border-transparent focus:border-glow-light dark:focus:border-glow-dark focus:ring-1 focus:ring-glow-light/50 dark:focus:ring-glow-dark/50 focus:outline-none transition-all duration-300"
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </header>

        <div className="flex-grow p-6 overflow-y-auto space-y-4">
          {filteredHistory.length > 0 ? (
            filteredHistory.map(item => (
              <GlassCard key={item.id} className="p-4 flex flex-col gap-3 animate-fade-in">
                <p className="font-semibold truncate text-gray-800 dark:text-gray-200" title={item.query}>{item.query}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(item.date).toLocaleString()}</span>
                  <div className="flex gap-2">
                    <button onClick={() => onDelete(item.id)} className="p-2 rounded-full text-red-500/80 hover:bg-red-500/10" title="Delete">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                    <LiquidButton onClick={() => onLoad(item.id)} className="px-4 py-1.5 text-sm">Load</LiquidButton>
                  </div>
                </div>
              </GlassCard>
            ))
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
              <p>No {history.length > 0 ? 'matching' : ''} history found.</p>
               {history.length > 0 && searchTerm && <p className="text-sm">Try a different search term.</p>}
               {history.length === 0 && <p className="text-sm">Completed research will appear here.</p>}
            </div>
          )}
        </div>
        
        {history.length > 0 && (
          <footer className="p-6 border-t border-border-light dark:border-border-dark">
            <LiquidButton onClick={onClear} className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/20">
              Clear All History
            </LiquidButton>
          </footer>
        )}
      </GlassCard>
    </div>
  );
};

export default HistoryPanel;