import React, { useState, useEffect } from 'react';
import { apiKeyService } from '../services/apiKeyService';
import GlassCard from './GlassCard';
import LiquidButton from './LiquidButton';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [isEnvKey, setIsEnvKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [isRendered, setIsRendered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setApiKey(apiKeyService.getApiKey() || '');
      setIsEnvKey(apiKeyService.isEnvKey());
      setSaveStatus('idle');
      const timer = setTimeout(() => setIsActive(true), 10); // Trigger animation
      return () => clearTimeout(timer);
    } else {
      setIsActive(false); // Trigger closing animation
    }
  }, [isOpen]);

  const handleSave = () => {
    apiKeyService.setApiKey(apiKey);
    setSaveStatus('saved');
    setTimeout(() => {
        onClose();
    }, 1500);
  };
  
  const handleTransitionEnd = () => {
    if (!isActive) {
      setIsRendered(false);
    }
  };

  const handleWrapperClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isRendered) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out ${isActive ? 'opacity-100' : 'opacity-0'}`} 
      onClick={handleWrapperClick}
      onTransitionEnd={handleTransitionEnd}
    >
      <GlassCard 
        className={`w-full max-w-lg flex flex-col p-6 sm:p-8 gap-4 transition-all duration-300 ease-in-out ${isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Settings</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <div className="space-y-2">
            <label htmlFor="api-key-input" className="font-semibold text-gray-700 dark:text-gray-300">Gemini API Key</label>
            {isEnvKey ? (
                <div className="w-full p-3 rounded-lg bg-black/10 dark:bg-black/20 text-gray-500 dark:text-gray-400 border border-transparent">
                    API Key is configured by the application host.
                </div>
            ) : (
                <input
                    id="api-key-input"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your Gemini API key"
                    className="w-full p-3 rounded-lg bg-black/10 dark:bg-black/20 border border-transparent focus:border-glow-light dark:focus:border-glow-dark focus:ring-2 focus:ring-glow-light/50 dark:focus:ring-glow-dark/50 focus:outline-none transition-all duration-300"
                />
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
                {isEnvKey 
                    ? "This key cannot be changed from the UI."
                    : "Your key is stored only in your browser's local storage."
                } Get a key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google AI Studio</a>.
            </p>
        </div>

        <div className="flex justify-end gap-3 mt-4">
            <LiquidButton onClick={onClose} className="bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 hover:shadow-none hover:-translate-y-0 active:translate-y-px">
                Cancel
            </LiquidButton>
            <LiquidButton onClick={handleSave} disabled={isEnvKey || saveStatus === 'saved'}>
                {saveStatus === 'saved' ? 'Saved!' : 'Save'}
            </LiquidButton>
        </div>
      </GlassCard>
    </div>
  );
};

export default SettingsModal;