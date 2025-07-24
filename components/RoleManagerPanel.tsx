
import React, { useState, useEffect } from 'react';
import { Role, FileData } from '../types';
import GlassCard from './GlassCard';
import LiquidButton from './LiquidButton';
import { useLanguage } from '../contextx/LanguageContext';
import { roleAIService } from '../services';
import Spinner from './Spinner';

interface RoleEditorProps {
    role: Role;
    onSave: (role: Role) => void;
    onCancel: () => void;
    isSaving: boolean;
}

const RoleEditor: React.FC<RoleEditorProps> = ({ role: initialRole, onSave, onCancel, isSaving }) => {
    const { t } = useLanguage();
    const [role, setRole] = useState(initialRole);
    const [aiStatus, setAiStatus] = useState<'idle' | 'generating' | 'optimizing'>('idle');
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleGenerateNameEmoji = async () => {
        if (!role.prompt) return;
        setAiStatus('generating');
        try {
            const { name, emoji } = await roleAIService.generateNameAndEmoji(role.prompt);
            setRole(prev => ({ ...prev, name, emoji }));
        } catch (e) {
            console.error("Failed to generate name and emoji:", e);
        } finally {
            setAiStatus('idle');
        }
    };

    const handleOptimizePrompt = async (mode: 'creative' | 'refine') => {
        if (!role.prompt) return;
        setAiStatus('optimizing');
        try {
            const optimizedPrompt = await roleAIService.optimizePrompt(role.prompt, mode);
            setRole(prev => ({ ...prev, prompt: optimizedPrompt }));
        } catch (e) {
            console.error("Failed to optimize prompt:", e);
        } finally {
            setAiStatus('idle');
        }
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64String = e.target?.result as string;
            setRole(prev => ({...prev, file: { name: selectedFile.name, mimeType: selectedFile.type, data: base64String.split(',')[1] }}));
        };
        reader.readAsDataURL(selectedFile);
    };

    const handleRemoveFile = () => {
        setRole(prev => ({...prev, file: null}));
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="p-6 bg-slate-100/90 dark:bg-black/20 rounded-2xl animate-fade-in flex flex-col gap-4">
            <div className="flex gap-4 items-center">
                <input type="text" value={role.emoji} onChange={e => setRole({ ...role, emoji: e.target.value })} maxLength={2} className="text-4xl w-16 h-16 text-center bg-white/40 dark:bg-black/20 rounded-2xl" />
                <input type="text" value={role.name} onChange={e => setRole({ ...role, name: e.target.value })} placeholder={t('roleNamePlaceholder')} className="w-full text-2xl font-bold bg-transparent focus:outline-none" />
            </div>
            
            <textarea value={role.prompt} onChange={e => setRole({ ...role, prompt: e.target.value })} placeholder={t('rolePromptPlaceholder')} className="w-full h-48 p-3 rounded-2xl resize-none bg-white/40 dark:bg-black/20 border border-transparent focus:border-glow-light dark:focus:border-glow-dark focus:ring-1 focus:outline-none transition-all text-sm" />
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">AI Assist:</span>
                <LiquidButton onClick={handleGenerateNameEmoji} disabled={!role.prompt || aiStatus !== 'idle'} className="px-3 py-1.5 text-xs flex items-center gap-2 bg-blue-500/10 dark:bg-blue-400/10 border-blue-500/20">{aiStatus === 'generating' ? <Spinner/> : '🤖'} {t('generateNameEmoji')}</LiquidButton>
                <button onClick={() => handleOptimizePrompt('refine')} disabled={!role.prompt || aiStatus !== 'idle'} className="px-3 py-1.5 text-xs rounded-2xl flex items-center gap-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors disabled:opacity-50">{aiStatus === 'optimizing' ? <Spinner/> : '✨'} {t('refinePrompt')}</button>
                <button onClick={() => handleOptimizePrompt('creative')} disabled={!role.prompt || aiStatus !== 'idle'} className="px-3 py-1.5 text-xs rounded-2xl flex items-center gap-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors disabled:opacity-50">{aiStatus === 'optimizing' ? <Spinner/> : '🎨'} {t('creativePrompt')}</button>
            </div>
            
            <div className="pt-4 border-t border-border-light dark:border-border-dark">
                {!role.file ? (
                    <label htmlFor="role-file-upload" className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-2xl cursor-pointer bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors w-fit" title={t('attachFile')}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>{t('attachContextFile')}</label>
                ) : (
                    <div className="flex items-center justify-between px-2 py-1 text-xs rounded-2xl bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 max-w-xs"><span className="truncate" title={role.file.name}>{role.file.name}</span><button onClick={handleRemoveFile} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10" title={t('removeFile')}><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
                )}
                <input type="file" id="role-file-upload" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
            </div>

            <div className="flex justify-end items-center gap-3">
                <LiquidButton onClick={onCancel} className="bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 hover:shadow-none hover:-translate-y-0 active:translate-y-px">{t('cancel')}</LiquidButton>
                <LiquidButton onClick={() => onSave(role)} disabled={isSaving || !role.name.trim()}>{isSaving ? <Spinner /> : t('saveRole')}</LiquidButton>
            </div>
        </div>
    );
};

interface RoleManagerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  roles: Role[];
  onSaveRole: (role: Role) => void;
  onDeleteRole: (id: string) => void;
}

const RoleManagerPanel: React.FC<RoleManagerPanelProps> = ({ isOpen, onClose, roles, onSaveRole, onDeleteRole }) => {
  const { t } = useLanguage();
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
        setEditingRole(null);
    }
  }, [isOpen]);

  const handleCreateNew = () => {
    setEditingRole({ id: Date.now().toString(), name: '', emoji: '✨', prompt: '', isBuiltIn: false });
  };

  const handleSave = (role: Role) => {
    setIsSaving(true);
    onSaveRole(role);
    setEditingRole(null);
    setIsSaving(false);
  };

  const handleDelete = (id: string) => {
    onDeleteRole(id);
  };

  return (
    <div className={`fixed inset-0 z-50 transition-all duration-500 ease-in-out ${isOpen ? 'visible' : 'invisible'}`}>
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-md transition-opacity duration-500" onClick={onClose}></div>
      <GlassCard className={`absolute top-0 right-0 h-full w-full max-w-xl flex flex-col p-0 bg-slate-100/90 transition-transform duration-500 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <header className="flex items-center justify-between p-6 shrink-0 border-b border-border-light dark:border-border-dark">
          <h2 className="text-2xl font-bold">{editingRole ? t('editRole') : t('manageRoles')}</h2>
          <div className='flex items-center gap-2'>
            {!editingRole && <LiquidButton onClick={handleCreateNew} className="text-sm px-4 py-2">{t('createNewRole')}</LiquidButton>}
            <button onClick={onClose} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title={t('close')}><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        </header>

        <div className="flex-grow p-6 overflow-y-auto space-y-4">
          {editingRole ? (
            <RoleEditor role={editingRole} onSave={handleSave} onCancel={() => setEditingRole(null)} isSaving={isSaving} />
          ) : (
            roles.map(role => (
              <GlassCard key={role.id} className="p-4 animate-fade-in flex items-center gap-4 group">
                <div className="text-4xl">{role.emoji}</div>
                <div className="flex-grow">
                  <h3 className="font-bold">{role.name} {role.isBuiltIn && <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">({t('builtIn')})</span>}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{role.prompt}</p>
                </div>
                {!role.isBuiltIn && (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <LiquidButton onClick={() => setEditingRole(role)} className="px-3 py-1.5 text-xs">{t('edit')}</LiquidButton>
                    <LiquidButton onClick={() => handleDelete(role.id)} className="px-3 py-1.5 text-xs bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20">{t('delete')}</LiquidButton>
                  </div>
                )}
              </GlassCard>
            ))
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default RoleManagerPanel;
