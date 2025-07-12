import React, { useState, useEffect } from 'react';
import { useNotification } from '../contextx/NotificationContext';
import { apiKeyService } from '../services/apiKeyService';
import { settingsService } from '../services/settingsService';
import { ResearchMode } from '../types';
import GlassCard from './GlassCard';
import LiquidButton from './LiquidButton';
import Spinner from './Spinner';
import ApiSettings from './settings/ApiSettings';
import ModelSettings from './settings/ModelSettings';
import ParamSettings from './settings/ParamSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: ResearchMode;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, currentMode }) => {
  const [activeTab, setActiveTab] = useState('api');
  const [isRendered, setIsRendered] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState(() => settingsService.getSettings());
  const [apiKey, setApiKey] = useState(() => apiKeyService.getApiKey() || '');
  
  const addNotification = useNotification();
  
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setSettings(settingsService.getSettings()); // Re-fetch on open
      setApiKey(apiKeyService.getApiKey() || '');
      const timer = setTimeout(() => setIsActive(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsActive(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    setIsSaving(true);
    if (!apiKeyService.isEnvKey()) {
        apiKeyService.setApiKey(apiKey);
    }
    settingsService.save(settings);
    setTimeout(() => {
        setIsSaving(false);
        addNotification({type: 'success', title: 'Settings Saved', message: 'Your settings have been updated.'});
        onClose();
    }, 500);
  };

  if (!isRendered) return null;

  const tabs = [
    { id: 'api', label: 'API Key' },
    { id: 'params', label: 'Parameters' },
    { id: 'models', label: 'Models' },
  ];

  return (
    <div
      className={`fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out ${isActive ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onTransitionEnd={() => !isActive && setIsRendered(false)}
    >
      <GlassCard
        className={`w-full max-w-2xl flex flex-col p-0 bg-slate-100/90 transition-all duration-300 ease-in-out overflow-hidden ${isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-6 shrink-0 border-b border-border-light dark:border-border-dark">
          <h2 className="text-2xl font-bold">Settings</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title="Close"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </header>

        <div className="flex flex-col md:flex-row flex-grow min-h-[400px]">
          <nav className="flex md:flex-col p-4 border-b md:border-b-0 md:border-r border-border-light dark:border-border-dark">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 text-sm md:text-base text-left rounded-lg font-semibold transition-colors ${activeTab === tab.id ? 'bg-glow-light/20 dark:bg-glow-dark/30 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10'}`}>{tab.label}</button>
            ))}
          </nav>

          <main className="p-6 flex-grow overflow-y-auto">
            {activeTab === 'api' && <ApiSettings apiKey={apiKey} setApiKey={setApiKey} />}
            {activeTab === 'models' && <ModelSettings settings={settings} setSettings={setSettings} currentMode={currentMode} />}
            {activeTab === 'params' && <ParamSettings settings={settings} setSettings={setSettings} />}
          </main>
        </div>

        <footer className="flex justify-end gap-3 mt-auto p-6 border-t border-border-light dark:border-border-dark">
          <LiquidButton onClick={onClose} className="bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 hover:shadow-none hover:-translate-y-0 active:translate-y-px">Cancel</LiquidButton>
          <LiquidButton onClick={handleSave} disabled={isSaving}>{isSaving ? <><Spinner /> Saving...</> : 'Save & Close'}</LiquidButton>
        </footer>
      </GlassCard>
    </div>
  );
};

export default SettingsModal;