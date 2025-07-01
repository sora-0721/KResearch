
import React from 'react';

interface ThemeSwitcherProps {
  isDarkMode: boolean;
  onToggle: () => void;
}

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ isDarkMode, onToggle }) => {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={isDarkMode} onChange={onToggle} className="sr-only peer" />
      <div className="
        w-14 h-8 rounded-full 
        bg-glass-light dark:bg-glass-dark 
        border border-border-light dark:border-border-dark
        peer-checked:after:translate-x-full 
        peer-checked:after:border-white 
        after:content-[''] 
        after:absolute 
        after:top-1 after:left-1
        after:bg-white/90
        after:border after:border-gray-300/50
        after:rounded-full 
        after:h-6 after:w-6 
        after:transition-all
        peer-checked:bg-glow-light dark:peer-checked:bg-glow-dark peer-checked:shadow-lg peer-checked:shadow-glow-light/50 dark:peer-checked:shadow-glow-dark/50
        peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-glow-light/50 dark:peer-focus:ring-glow-dark/50
      "></div>
      <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
        {isDarkMode ? 'Dark' : 'Light'}
      </span>
    </label>
  );
};

export default ThemeSwitcher;
