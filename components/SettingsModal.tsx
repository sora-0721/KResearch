import React, { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { apiKeyService } from '../services/apiKeyService';
import { settingsService } from '../services/settingsService';
import { AppSettings, AgentRole } from '../types';
import GlassCard from './GlassCard';
import LiquidButton from './LiquidButton';
import Spinner from './Spinner';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AGENT_ROLES: AgentRole[] = ['planner', 'searcher', 'synthesizer', 'clarification', 'visualizer'];

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('api');
  const [isRendered, setIsRendered] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isEnvKey, setIsEnvKey] = useState(false);
  
  const [settings, setSettings] = useState<AppSettings>(settingsService.getSettings());
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const addNotification = useNotification();

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setApiKey(apiKeyService.getApiKey() || '');
      setIsEnvKey(apiKeyService.isEnvKey());
      setSettings(settingsService.getSettings());
      setIsSaving(false);

      const fetchModels = async () => {
        if (apiKeyService.hasKey()) {
          setIsLoadingModels(true);
          try {
            const models = await settingsService.fetchAvailableModels();
            setAvailableModels(models);
          } catch (e: any) {
            addNotification({ type: 'error', title: 'Failed to Fetch Models', message: e.message || "Check API Key and connection." });
          } finally {
            setIsLoadingModels(false);
          }
        } else {
            setAvailableModels([]);
        }
      };
      
      fetchModels();

      const timer = setTimeout(() => setIsActive(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsActive(false);
    }
  }, [isOpen, addNotification]);

  const handleSave = () => {
    setIsSaving(true);
    if (!isEnvKey) {
        apiKeyService.setApiKey(apiKey);
    }
    settingsService.save(settings);
    setTimeout(() => {
        setIsSaving(false);
        addNotification({type: 'success', title: 'Settings Saved', message: 'Your settings have been updated.'});
        onClose();
    }, 500);
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
  
  const handleSettingChange = (category: keyof AppSettings, key: string, value: any) => {
      setSettings(prev => ({
          ...prev,
          [category]: {
              ...prev[category],
              [key]: value
          }
      }));
  };

  if (!isRendered) return null;

  const tabs = [
    { id: 'api', label: 'API Key' },
    { id: 'models', label: 'Models' },
    { id: 'params', label: 'Parameters' },
  ];

  return (
    <div
      className={`fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out ${isActive ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleWrapperClick}
      onTransitionEnd={handleTransitionEnd}
    >
      <GlassCard
        className={`w-full max-w-2xl flex flex-col p-0 bg-slate-100/90 transition-all duration-300 ease-in-out overflow-hidden ${isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-6 shrink-0 border-b border-border-light dark:border-border-dark">
          <h2 className="text-2xl font-bold">Settings</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <div className="flex flex-col md:flex-row flex-grow min-h-[400px]">
          <nav className="flex md:flex-col p-4 border-b md:border-b-0 md:border-r border-border-light dark:border-border-dark">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 text-sm md:text-base text-left rounded-lg font-semibold transition-colors ${activeTab === tab.id ? 'bg-glow-light/20 dark:bg-glow-dark/30 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10'}`}>
                {tab.label}
              </button>
            ))}
          </nav>

          <main className="p-6 flex-grow overflow-y-auto">
            {activeTab === 'api' && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-lg font-semibold">Gemini API Key</h3>
                {isEnvKey ? (
                  <div className="w-full p-3 rounded-lg bg-slate-200/60 dark:bg-black/20 text-gray-500 dark:text-gray-400 border border-transparent">API Key is configured by the application host.</div>
                ) : (
                  <input id="api-key-input" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Enter your Gemini API key" className="w-full p-3 rounded-lg bg-white/60 dark:bg-black/20 border border-transparent focus:border-glow-light dark:focus:border-glow-dark focus:ring-2 focus:ring-glow-light/50 dark:focus:ring-glow-dark/50 focus:outline-none transition-all" />
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isEnvKey ? "This key cannot be changed from the UI." : "Your key is stored only in your browser's local storage."} Get a key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google AI Studio</a>.
                </p>
                 {!apiKeyService.hasKey() && (
                    <div className="p-3 text-sm rounded-lg bg-yellow-500/10 text-yellow-800 dark:text-yellow-200 border border-yellow-500/20">
                        An API Key is required to use the application.
                    </div>
                 )}
              </div>
            )}
            
            {activeTab === 'models' && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-lg font-semibold">Model Configuration</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Override default models for each agent. Select "Default" to use the model specified by the current research mode.</p>
                {isLoadingModels && <div className="flex items-center gap-2 text-sm"><Spinner /><span>Fetching available models...</span></div>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {AGENT_ROLES.map(role => (
                    <div key={role} className="space-y-1">
                      <label htmlFor={`model-${role}`} className="font-semibold text-gray-700 dark:text-gray-300 capitalize text-sm">{role}</label>
                      <select id={`model-${role}`} value={settings.modelOverrides[role] || 'default'} onChange={e => handleSettingChange('modelOverrides', role, e.target.value === 'default' ? null : e.target.value)} disabled={isLoadingModels || availableModels.length === 0} className="w-full p-2 rounded-lg bg-white/60 dark:bg-black/20 border border-transparent focus:border-glow-light dark:focus:border-glow-dark focus:ring-1 focus:ring-glow-light/50 dark:focus:ring-glow-dark/50 focus:outline-none transition-all text-sm disabled:opacity-50">
                        <option value="default">Default (Mode-based)</option>
                        {availableModels.map(modelName => (
                          <option key={modelName} value={modelName}>{modelName}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'params' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-lg font-semibold">Research Parameters</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1">
                      <label htmlFor="min-cycles" className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Min Research Cycles</label>
                      <input type="number" id="min-cycles" value={settings.researchParams.minCycles} onChange={e => handleSettingChange('researchParams', 'minCycles', parseInt(e.target.value, 10))} className="w-full p-2 rounded-lg bg-white/60 dark:bg-black/20 border border-transparent focus:border-glow-light dark:focus:border-glow-dark focus:ring-1 focus:ring-glow-light/50 dark:focus:ring-glow-dark/50 focus:outline-none transition-all" />
                      <p className="text-xs text-gray-500 dark:text-gray-400">Minimum cycles before finishing.</p>
                  </div>
                   <div className="space-y-1">
                      <label htmlFor="max-cycles" className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Max Research Cycles</label>
                      <input type="number" id="max-cycles" value={settings.researchParams.maxCycles} onChange={e => handleSettingChange('researchParams', 'maxCycles', parseInt(e.target.value, 10))} className="w-full p-2 rounded-lg bg-white/60 dark:bg-black/20 border border-transparent focus:border-glow-light dark:focus:border-glow-dark focus:ring-1 focus:ring-glow-light/50 dark:focus:ring-glow-dark/50 focus:outline-none transition-all" />
                      <p className="text-xs text-gray-500 dark:text-gray-400">Hard limit for research iterations.</p>
                  </div>
                   <div className="space-y-1">
                      <label htmlFor="max-debate" className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Max Debate Rounds</label>
                      <input type="number" id="max-debate" value={settings.researchParams.maxDebateRounds} onChange={e => handleSettingChange('researchParams', 'maxDebateRounds', parseInt(e.target.value, 10))} className="w-full p-2 rounded-lg bg-white/60 dark:bg-black/20 border border-transparent focus:border-glow-light dark:focus:border-glow-dark focus:ring-1 focus:ring-glow-light/50 dark:focus:ring-glow-dark/50 focus:outline-none transition-all" />
                      <p className="text-xs text-gray-500 dark:text-gray-400">Agent planning conversation length.</p>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>

        <footer className="flex justify-end gap-3 mt-auto p-6 border-t border-border-light dark:border-border-dark">
          <LiquidButton onClick={onClose} className="bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 hover:shadow-none hover:-translate-y-0 active:translate-y-px">
            Cancel
          </LiquidButton>
          <LiquidButton onClick={handleSave} disabled={isSaving}>
            {isSaving ? <><Spinner /> Saving...</> : 'Save & Close'}
          </LiquidButton>
        </footer>
      </GlassCard>
    </div>
  );
};

export default SettingsModal;