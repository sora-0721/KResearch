
import React, { useState, useEffect } from 'react';
import { useNotification } from '../contextx/NotificationContext';
import { useLanguage } from '../contextx/LanguageContext';
import { apiKeyService } from '../services/apiKeyService';
import { DEFAULT_SETTINGS, settingsService } from '../services/settingsService';
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
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('api');
  const [isRendered, setIsRendered] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [settings, setSettings] = useState(() => settingsService.getSettings());
  const [apiKey, setApiKey] = useState(() => apiKeyService.getApiKeysString());
  const [apiBaseUrl, setApiBaseUrl] = useState(() => apiKeyService.getApiBaseUrl());
  
  const addNotification = useNotification();
  
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setSettings(settingsService.getSettings()); // Re-fetch on open
      setApiKey(apiKeyService.getApiKeysString());
      setApiBaseUrl(apiKeyService.getApiBaseUrl());
      const timer = setTimeout(() => setIsActive(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsActive(false);
    }
  }, [isOpen]);
  
  // Auto-save settings when they change
  useEffect(() => {
    if (!isActive) return;

    const handler = setTimeout(() => {
        settingsService.save(settings);
        if (!apiKeyService.isEnvKey()) {
            apiKeyService.setApiKeys(apiKey);
            apiKeyService.setApiBaseUrl(apiBaseUrl);
        }
    }, 500); // Debounce for 500ms

    return () => clearTimeout(handler);
  }, [settings, apiKey, apiBaseUrl, isActive]);

  const handleRestoreDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    // Let the useEffect handle saving the updated state
    setApiBaseUrl('https://generativelanguage.googleapis.com');
    addNotification({type: 'info', title: t('defaultsLoadedTitle'), message: t('defaultsLoadedMessage')});
  };

  if (!isRendered) return null;

  const tabs = [
    { id: 'api', label: t('apiKey') },
    { id: 'params', label: t('parameters') },
    { id: 'models', label: t('models') },
  ];

  return (
    <div
      className={`fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-md z-50 flex items-start justify-center p-4 overflow-y-auto transition-opacity duration-300 ease-in-out ${isActive ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onTransitionEnd={() => !isActive && setIsRendered(false)}
    >
      <GlassCard
        className={`w-full max-w-2xl flex flex-col my-auto p-0 bg-slate-100/90 transition-all duration-300 ease-in-out overflow-hidden ${isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-6 shrink-0 border-b border-border-light dark:border-border-dark">
          <h2 className="text-2xl font-bold">{t('settings')}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title={t('close')}><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </header>

        <div className="flex flex-col md:flex-row flex-grow min-h-0">
          <nav className="flex md:flex-col p-4 border-b md:border-b-0 md:border-r border-border-light dark:border-border-dark overflow-x-auto md:overflow-x-visible">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 text-sm md:text-base text-left rounded-2xl font-semibold transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-glow-light/20 dark:bg-glow-dark/30 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10'}`}>{tab.label}</button>
            ))}
          </nav>

          <main className="p-6 flex-grow overflow-y-auto h-[480px]">
            {activeTab === 'api' && <ApiSettings apiKey={apiKey} setApiKey={setApiKey} apiBaseUrl={apiBaseUrl} setApiBaseUrl={setApiBaseUrl} />}
            {activeTab === 'models' && <ModelSettings settings={settings} setSettings={setSettings} currentMode={currentMode} />}
            {activeTab === 'params' && <ParamSettings settings={settings} setSettings={setSettings} />}
          </main>
        </div>

        <footer className="flex justify-between items-center gap-3 mt-auto p-6 border-t border-border-light dark:border-border-dark">
            <LiquidButton onClick={handleRestoreDefaults} className="bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/20">{t('restoreDefaults')}</LiquidButton>
            <div className="flex items-center gap-3">
                <LiquidButton onClick={onClose} className="bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 hover:shadow-none hover:-translate-y-0 active:translate-y-px">{t('close')}</LiquidButton>
            </div>
        </footer>
      </GlassCard>
    </div>
  );
};

export default SettingsModal;
