import React, { useState, useRef, useEffect } from 'react';
import GlassCard from '../GlassCard';
import Spinner from '../Spinner';
import { FileData } from '../../types';

// --- Tool Icons ---
const EmojiIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9 9.75h.008v.008H9V9.75Zm6 0h.008v.008H15V9.75Z" /></svg>;
const PolishIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.572L16.5 21.75l-.398-1.178a3.375 3.375 0 00-2.3-2.3L12.75 18l1.178-.398a3.375 3.375 0 002.3-2.3L16.5 14.25l.398 1.178a3.375 3.375 0 002.3 2.3l1.178.398-1.178.398a3.375 3.375 0 00-2.3 2.3z" /></svg>;
const ReadingLevelIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>;
const LengthIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M8 7.5h8m-8 9h8" /></svg>;
const CustomIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>;

// --- Popover Panels ---
const SliderPanel: React.FC<{ title: string; options: string[]; onSelect: (value: string) => void; isRewriting: boolean; instructionPrefix: string; defaultOption: string; }> = ({ title, options, onSelect, isRewriting, instructionPrefix, defaultOption }) => {
    const defaultIndex = options.indexOf(defaultOption);
    const initialValue = defaultIndex !== -1 ? defaultIndex : Math.floor(options.length / 2);

    const [value, setValue] = useState(initialValue);
    const displayOption = options[options.length - 1 - value];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setValue(parseInt(e.target.value, 10));

    const handleInteractionEnd = () => {
        if (isRewriting) return;
        const selectedOption = options[options.length - 1 - value];
        onSelect(`${instructionPrefix}: ${selectedOption}`);
    };

    return (
        <div className="flex flex-col items-center gap-2 text-center p-2">
            <h4 className="font-semibold">{title}</h4>
            <div className="flex items-center gap-4 h-48">
                <div className="w-8 flex justify-center items-center">
                    <input type="range" min="0" max={options.length - 1} value={value} onChange={handleChange} onMouseUp={handleInteractionEnd} onTouchEnd={handleInteractionEnd} disabled={isRewriting} style={{ writingMode: 'vertical-lr' }} className="w-2 h-36 slider-vertical accent-glow-dark dark:accent-glow-light"/>
                </div>
                <div className="flex flex-col justify-between h-40 text-xs text-gray-500 dark:text-gray-400 w-24 text-left">
                    <span>{options[options.length - 1]}</span>
                    <span>{options[0]}</span>
                </div>
            </div>
            <p className="text-xs h-4 font-medium -mt-4">{displayOption}</p>
        </div>
    );
};

const EmojiPanel: React.FC<{ onSelect: (value: string) => void; isRewriting: boolean }> = ({ onSelect, isRewriting }) => (
    <div className="p-2 space-y-3">
        <h4 className="font-semibold text-center">Add Emojis</h4>
        <div className="grid grid-cols-2 gap-2">
            {['Words', 'Sections', 'Lists', 'Remove'].map(opt => (
                <button key={opt} onClick={() => onSelect(`Add emojis to ${opt.toLowerCase()}`)} disabled={isRewriting} className="p-2 rounded-lg text-sm text-center hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-50">{opt}</button>
            ))}
        </div>
    </div>
);

const CustomPanel: React.FC<{ onSelect: (instruction: string, file: FileData | null) => void; isRewriting: boolean }> = ({ onSelect, isRewriting }) => {
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
        <div className="p-3 space-y-3">
            <h4 className="font-semibold text-center">Custom Edit</h4>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g., Rewrite this in a more casual tone, using the attached file for context." disabled={isRewriting} className="w-full h-24 p-2 text-sm rounded-lg resize-none bg-black/10 dark:bg-black/20 border-transparent focus:border-glow-light dark:focus:border-glow-dark focus:ring-1 focus:outline-none"/>
            <div className="flex items-center justify-between gap-2">
                {!file ? (
                    <label htmlFor="edit-file-upload" className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg cursor-pointer bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title="Attach file"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>Attach</label>
                ) : (
                    <div className="flex items-center justify-between px-2 py-1 text-xs rounded-lg bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 w-full max-w-[150px]"><span className="truncate" title={file.name}>{file.name}</span><button onClick={handleRemoveFile} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10" title="Remove file"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
                )}
                 <input type="file" id="edit-file-upload" ref={fileInputRef} className="hidden" onChange={handleFileChange} disabled={isRewriting} />
            </div>
            <button onClick={handleSubmit} disabled={isRewriting || (!text.trim() && !file)} className="w-full px-4 py-2 text-sm rounded-lg bg-glow-light/20 dark:bg-glow-dark/30 hover:bg-glow-light/30 dark:hover:bg-glow-dark/40 disabled:opacity-50 flex justify-center">{isRewriting ? <Spinner /> : "Apply"}</button>
        </div>
    );
};

// --- Main Toolbox Component ---
interface ReportToolboxProps {
    onRewrite: (instruction: string, file: FileData | null) => void;
    isRewriting: boolean;
}

const ReportToolbox: React.FC<ReportToolboxProps> = ({ onRewrite, isRewriting }) => {
    const [activeTool, setActiveTool] = useState<string | null>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    const handleToolClick = (toolId: string) => {
        if (isRewriting) return;
        if (toolId === 'polish') {
            onRewrite('Add a final polish: proofread for grammar and clarity, improve flow, but do not alter the core meaning or content.', null);
            setActiveTool(null);
            return;
        }
        setActiveTool(current => (current === toolId ? null : toolId));
    };

    const handleInstructionSelect = (instruction: string, file: FileData | null = null) => {
        onRewrite(instruction, file);
        setActiveTool(null);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (popoverRef.current && !popoverRef.current.contains(target) && !target.parentElement?.closest('[data-toolbox-button]')) {
                setActiveTool(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const tools = [
        { id: 'emoji', icon: <EmojiIcon />, label: 'Add Emojis' },
        { id: 'polish', icon: <PolishIcon />, label: 'Add Final Polish' },
        { id: 'readingLevel', icon: <ReadingLevelIcon />, label: 'Reading Level' },
        { id: 'length', icon: <LengthIcon />, label: 'Adjust Length' },
        { id: 'custom', icon: <CustomIcon />, label: 'Custom Edit' },
    ];

    return (
        <div className="relative">
            <GlassCard className="p-2 flex flex-col items-center gap-2">
                {tools.map(tool => (
                    <div key={tool.id} className="relative group">
                        <button data-toolbox-button onClick={() => handleToolClick(tool.id)} disabled={isRewriting && activeTool !== tool.id} className={`p-3 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${activeTool === tool.id ? 'bg-glow-dark/30 dark:bg-glow-light/20' : 'hover:bg-black/10 dark:hover:bg-white/10'}`} aria-label={tool.label}>
                            {isRewriting && activeTool === tool.id ? <Spinner/> : tool.icon}
                        </button>
                        <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-2 py-1 bg-gray-900 text-white text-xs rounded-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">{tool.label}</div>
                    </div>
                ))}
            </GlassCard>
            
            {activeTool && (
                 <div ref={popoverRef} className="absolute right-full top-1/2 -translate-y-1/2 mr-4 w-64 z-20 animate-fade-in">
                    <GlassCard>
                        {activeTool === 'length' && <SliderPanel title="Adjust Length" options={['Shortest', 'Shorter', 'Current Length', 'Longer', 'Longest']} defaultOption="Current Length" onSelect={handleInstructionSelect} isRewriting={isRewriting} instructionPrefix="Change the length of the report to" />}
                        {activeTool === 'readingLevel' && <SliderPanel title="Reading Level" options={['Kindergarten', 'Middle School', 'High School', 'Current Level', 'College', 'Graduate School']} defaultOption="Current Level" onSelect={handleInstructionSelect} isRewriting={isRewriting} instructionPrefix="Change the reading level to" />}
                        {activeTool === 'emoji' && <EmojiPanel onSelect={handleInstructionSelect} isRewriting={isRewriting} />}
                        {activeTool === 'custom' && <CustomPanel onSelect={handleInstructionSelect} isRewriting={isRewriting} />}
                    </GlassCard>
                </div>
            )}
        </div>
    );
};

export default ReportToolbox;
