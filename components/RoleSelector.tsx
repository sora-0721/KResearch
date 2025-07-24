


import React, { useState, useRef, useEffect } from 'react';
import { Role } from '../types';
import GlassCard from './GlassCard';
import { useLanguage } from '../contextx/LanguageContext';

interface RoleSelectorProps {
    roles: Role[];
    selectedRoleId: string | null;
    onSelectRole: (roleId: string | null) => void;
    disabled?: boolean;
}

const DefaultRoleIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`${className} text-gray-500 dark:text-gray-400`} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
);


const RoleSelector: React.FC<RoleSelectorProps> = ({ roles, selectedRoleId, onSelectRole, disabled }) => {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const selectedRole = roles.find(r => r.id === selectedRoleId);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (id: string | null) => {
        onSelectRole(id);
        setIsOpen(false);
    };

    const isDefault = !selectedRole;
    const displayName = selectedRole ? selectedRole.name : t('defaultRole');

    return (
        <div ref={wrapperRef} className="relative">
            <button
                onClick={() => setIsOpen(p => !p)}
                disabled={disabled}
                className="p-2 rounded-full cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                title={t('selectRole')}
            >
                <div className="h-5 w-5 flex items-center justify-center">
                    {isDefault ? (
                        <DefaultRoleIcon />
                    ) : (
                        <span className="text-xl">{selectedRole.emoji}</span>
                    )}
                </div>
                <span className="sr-only">{displayName}</span>
            </button>

             <div className={`absolute top-full right-0 mt-2 w-72 z-50 origin-top-right ease-out duration-200 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}>
                <GlassCard className="p-2 max-h-80 overflow-y-auto">
                    <ul className="space-y-1">
                        <li>
                            <button onClick={() => handleSelect(null)} className={`w-full flex items-center gap-3 text-left p-2 rounded-2xl text-sm transition-colors ${!selectedRoleId ? 'bg-glow-dark/20' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}>
                                <span className="w-8 h-8 flex items-center justify-center">
                                    <DefaultRoleIcon className="h-6 w-6" />
                                </span>
                                <div>
                                    <p className="font-semibold">{t('defaultRole')}</p>
                                    <p className="text-xs opacity-70">{t('defaultRoleDesc')}</p>
                                </div>
                            </button>
                        </li>
                        {roles.map(role => (
                            <li key={role.id}>
                                <button onClick={() => handleSelect(role.id)} className={`w-full flex items-center gap-3 text-left p-2 rounded-2xl text-sm transition-colors ${selectedRoleId === role.id ? 'bg-glow-dark/20' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}>
                                    <span className="text-2xl w-8 h-8 flex items-center justify-center" title={role.isBuiltIn ? t('builtIn') : t('custom')}>{role.emoji}</span>
                                    <div>
                                        <p className="font-semibold">{role.name}</p>
                                        <p className="text-xs opacity-70 line-clamp-1">{role.prompt}</p>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </GlassCard>
            </div>
        </div>
    );
};

export default RoleSelector;
