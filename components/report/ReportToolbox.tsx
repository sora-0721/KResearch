
import React, { useState, useRef, useEffect } from 'react';
import GlassCard from '../GlassCard';
import Spinner from '../Spinner';
import { FileData, TranslationStyle } from '../../types';
import { useLanguage } from '../../contextx/LanguageContext';

// --- Tool Icons ---
const EmojiIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9 9.75h.008v.008H9V9.75Zm6 0h.008v.008H15V9.75Z" /></svg>;
const PolishIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.572L16.5 21.75l-.398-1.178a3.375 3.375 0 00-2.3-2.3L12.75 18l1.178-.398a3.375 3.375 0 002.3-2.3L16.5 14.25l.398 1.178a3.375 3.375 0 002.3 2.3l1.178.398-1.178.398a3.375 3.375 0 00-2.3 2.3z" /></svg>;
const ReadingLevelIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>;
const LengthIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M8 7.5h8m-8 9h8" /></svg>;
const CustomIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>;
const TranslateIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" className="w-6 h-6"><path d="m476-80 182-480h84L924-80h-84l-43-122H603L560-80h-84ZM160-200l-56-56 202-202q-35-35-63.5-80T190-640h84q20 39 40 68t48 58q33-33 68.5-92.5T484-720H40v-80h280v-80h80v80h280v80H564q-21 72-63 148t-83 116l96 98-30 82-122-125-202 201Zm468-72h144l-72-204-72 204Z"/></svg>;


// --- Popover Panels ---

const ButtonSelectionPanel: React.FC<{ 
    title: string; 
    options: string[]; 
    onSelect: (value: string) => void; 
    isRewriting: boolean; 
    instructionPrefix: string;
}> = ({ title, options, onSelect, isRewriting, instructionPrefix }) => {
    return (
        <div className="p-2 space-y-2 w-48">
            <h4 className="font-semibold text-center mb-1">{title}</h4>
            <div className="flex flex-col gap-1">
                {options.map(opt => (
                    <button 
                        key={opt} 
                        onClick={() => onSelect(`${instructionPrefix}: ${opt}`)} 
                        disabled={isRewriting} 
                        className="p-2 rounded-2xl text-sm text-center hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-50"
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );
};

const EmojiPanel: React.FC<{ onSelect: (value: string) => void; isRewriting: boolean }> = ({ onSelect, isRewriting }) => {
    const { t } = useLanguage();
    const options = [
        { label: t('emojisToWords'), instruction: 'Add appropriate emojis to key words and phrases throughout the report.' },
        { label: t('emojisToSections'), instruction: 'Add a relevant emoji to each section heading.' },
        { label: t('emojisToLists'), instruction: 'Add relevant emojis to the beginning of each list item.' },
        { label: t('emojisRemoveAll'), instruction: 'Remove all emojis from the report.' }
    ];

    return (
        <div className="p-2 space-y-2 w-44">
            <h4 className="font-semibold text-center mb-1">{t('addEmojisTitle')}</h4>
            <div className="flex flex-col gap-1">
                {options.map(opt => (
                    <button 
                        key={opt.label} 
                        onClick={() => onSelect(opt.instruction)} 
                        disabled={isRewriting} 
                        className="p-2 rounded-2xl text-sm text-center hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-50"
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

const CustomPanel: React.FC<{ onSelect: (instruction: string, file: FileData | null) => void; isRewriting: boolean }> = ({ onSelect, isRewriting }) => {
    const { t } = useLanguage();
    const [text, setText] = useState('');
    const [file, setFile] = useState<FileData | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selected = event.target.files?.[0];
        if (!selected) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64String = e.target?.result as string;
            setFile({ name: selected.name, mimeType: selected.type, data: base64String.split(',')[1] });
        };
        reader.readAsDataURL(selected);
    };

    const handleRemoveFile = () => {
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSubmit = () => {
        if (!text.trim() && !file) return;
        onSelect(text.trim(), file);
    };

    return (
        <div className="p-3 space-y-3 w-80">
            <h4 className="font-semibold text-center">{t('customEditTitle')}</h4>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t('customEditPlaceholder')} disabled={isRewriting} className="w-full h-40 p-2 text-sm rounded-2xl resize-none bg-white/40 dark:bg-black/20 border-transparent focus:border-glow-light dark:focus:border-glow-dark focus:ring-1 focus:outline-none"/>
            <div className="flex items-center justify-between gap-2">
                {!file ? (
                    <label htmlFor="edit-file-upload" className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-2xl cursor-pointer bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title={t('attachFile')}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>{t('attach')}</label>
                ) : (
                    <div className="flex items-center justify-between px-2 py-1 text-xs rounded-2xl bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 w-full max-w-[150px]"><span className="truncate" title={file.name}>{file.name}</span><button onClick={handleRemoveFile} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10" title={t('removeFile')}><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
                )}
                 <input type="file" id="edit-file-upload" ref={fileInputRef} className="hidden" onChange={handleFileChange} disabled={isRewriting} />
            </div>
            <button onClick={handleSubmit} disabled={isRewriting || (!text.trim() && !file)} className="w-full px-4 py-2 text-sm rounded-2xl bg-glow-light/20 dark:bg-glow-dark/30 hover:bg-glow-light/30 dark:hover:bg-glow-dark/40 disabled:opacity-50 flex justify-center">{isRewriting ? <Spinner /> : t('apply')}</button>
        </div>
    );
};

const TranslationPanel: React.FC<{ onTranslate: (language: string, style: TranslationStyle) => void, isTranslating: boolean }> = ({ onTranslate, isTranslating }) => {
    const { t } = useLanguage();
    const [language, setLanguage] = useState('Chinese');
    const [style, setStyle] = useState<TranslationStyle>('colloquial');

    const handleSubmit = () => {
        if (!language.trim()) return;
        onTranslate(language.trim(), style);
    };

    return (
        <div className="p-3 space-y-4 w-72">
            <h4 className="font-semibold text-center">{t('translateReportTitle')}</h4>
            <div>
                <label className="text-xs font-semibold">{t('language')}</label>
                <input
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    placeholder={t('languagePlaceholder')}
                    disabled={isTranslating}
                    list="languages"
                    className="w-full mt-1 p-2 text-sm rounded-2xl bg-white/40 dark:bg-black/20 border-transparent focus:border-glow-light dark:focus:border-glow-dark focus:ring-1 focus:outline-none"
                />
                <datalist id="languages">
                    <option value="English" />
                    <option value="Chinese" />
                    <option value="Malay" />
                    <option value="Spanish" />
                    <option value="French" />
                    <option value="German" />
                </datalist>
            </div>
            <div>
                <label className="text-xs font-semibold">{t('style')}</label>
                <div className="flex items-center gap-2 mt-1 bg-white/40 dark:bg-black/20 rounded-2xl p-1">
                    <button onClick={() => setStyle('colloquial')} disabled={isTranslating} className={`flex-1 text-xs px-2 py-1 rounded-2xl transition-colors ${style === 'colloquial' ? 'bg-glow-dark/30' : ''}`}>{t('colloquial')}</button>
                    <button onClick={() => setStyle('literal')} disabled={isTranslating} className={`flex-1 text-xs px-2 py-1 rounded-2xl transition-colors ${style === 'literal' ? 'bg-glow-dark/30' : ''}`}>{t('literal')}</button>
                </div>
            </div>
            <button onClick={handleSubmit} disabled={isTranslating || !language.trim()} className="w-full px-4 py-2 text-sm rounded-2xl bg-glow-light/20 dark:bg-glow-dark/30 hover:bg-glow-light/30 dark:hover:bg-glow-dark/40 disabled:opacity-50 flex justify-center items-center gap-2">
                {isTranslating ? <><Spinner />{t('translating')}</> : t('translate')}
            </button>
        </div>
    );
};

// --- Main Toolbox Component ---
interface ReportToolboxProps {
    onRewrite: (instruction: string, file: FileData | null) => void;
    isRewriting: boolean;
    onTranslate: (language: string, style: TranslationStyle) => void;
    isTranslating: boolean;
    isToolboxDisabled: boolean;
}

const ReportToolbox: React.FC<ReportToolboxProps> = ({ onRewrite, isRewriting, onTranslate, isTranslating, isToolboxDisabled }) => {
    const { t } = useLanguage();
    const [activeTool, setActiveTool] = useState<string | null>(null);
    const [runningTool, setRunningTool] = useState<string | null>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isRewriting && !isTranslating) {
            setRunningTool(null);
        }
    }, [isRewriting, isTranslating]);

    const handleToolClick = (toolId: string) => {
        if (isRewriting || isTranslating || isToolboxDisabled) return;
        if (toolId === 'polish') {
            setRunningTool(toolId);
            onRewrite('Add a final polish: proofread for grammar and clarity, improve flow, but do not alter the core meaning or content.', null);
            setActiveTool(null);
            return;
        }
        setActiveTool(current => (current === toolId ? null : toolId));
    };

    const handleInstructionSelect = (instruction: string, file: FileData | null = null) => {
        if (activeTool) {
            setRunningTool(activeTool);
        }
        onRewrite(instruction, file);
        setActiveTool(null);
    };

     const handleTranslateSelect = (language: string, style: TranslationStyle) => {
        if (activeTool) {
            setRunningTool(activeTool);
        }
        onTranslate(language, style);
        setActiveTool(null);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(event.target as Node) &&
                !(event.target as Element).closest('[data-toolbox-button]')
            ) {
                setActiveTool(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const tools = [
        { id: 'translate', icon: <TranslateIcon />, label: t('translate') },
        { id: 'emoji', icon: <EmojiIcon />, label: t('addEmojis') },
        { id: 'polish', icon: <PolishIcon />, label: t('addFinalPolish') },
        { id: 'readingLevel', icon: <ReadingLevelIcon />, label: t('readingLevel') },
        { id: 'length', icon: <LengthIcon />, label: t('adjustLength') },
        { id: 'custom', icon: <CustomIcon />, label: t('customEdit') },
    ];
    
    const isAnyToolRunning = isRewriting || isTranslating;

    return (
        <GlassCard className="p-2 flex flex-col items-center gap-2">
            {tools.map(tool => (
                <div key={tool.id} className="relative">
                    <div className="relative group">
                         <button data-toolbox-button onClick={() => handleToolClick(tool.id)} disabled={isAnyToolRunning || isToolboxDisabled} className={`p-3 rounded-2xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${activeTool === tool.id ? 'bg-glow-dark/30 dark:bg-glow-light/20' : 'hover:bg-black/10 dark:hover:bg-white/10'}`} aria-label={tool.label}>
                            {isAnyToolRunning && runningTool === tool.id ? <Spinner/> : tool.icon}
                        </button>
                        <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-2 py-1 bg-gray-900 text-white text-xs rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">{tool.label}</div>
                    </div>
                    
                    <div
                        ref={activeTool === tool.id ? popoverRef : null}
                        className={`absolute right-full top-1/2 -translate-y-1/2 mr-3 z-50 origin-right ease-out duration-200 ${
                            activeTool === tool.id
                                ? 'scale-100 opacity-100 transition-transform'
                                : 'scale-95 opacity-0 pointer-events-none transition-all'
                        }`}
                    >
                        <GlassCard>
                            {tool.id === 'length' && <ButtonSelectionPanel title={t('adjustLengthTitle')} options={[t('muchShorter'), t('shorter'), t('longer'), t('muchLonger')]} onSelect={handleInstructionSelect} isRewriting={isRewriting} instructionPrefix="Change the length of the report to be" />}
                            {tool.id === 'readingLevel' && <ButtonSelectionPanel title={t('readingLevelTitle')} options={[t('kindergarten'), t('middleSchool'), t('highSchool'), t('college'), t('graduateSchool')]} onSelect={handleInstructionSelect} isRewriting={isRewriting} instructionPrefix="Change the reading level to" />}
                            {tool.id === 'emoji' && <EmojiPanel onSelect={handleInstructionSelect} isRewriting={isRewriting} />}
                            {tool.id === 'custom' && <CustomPanel onSelect={handleInstructionSelect} isRewriting={isRewriting} />}
                            {tool.id === 'translate' && <TranslationPanel onTranslate={handleTranslateSelect} isTranslating={isTranslating} />}
                        </GlassCard>
                    </div>
                </div>
            ))}
        </GlassCard>
    );
};

export default ReportToolbox;