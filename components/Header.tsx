import React from 'react';
import type { Theme } from '../types';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';

interface HeaderProps {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

export const Header: React.FC<HeaderProps> = ({ theme, setTheme }) => {
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="bg-secondary-light dark:bg-secondary-dark border-b border-tertiary-light dark:border-tertiary-dark sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
           <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-2 rounded-lg">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
           </div>
           <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">BotBuilder Web</h1>
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full text-text-secondary-light dark:text-text-secondary-dark hover:bg-tertiary-light dark:hover:bg-tertiary-dark transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <SunIcon className="w-6 h-6" />
          ) : (
            <MoonIcon className="w-6 h-6" />
          )}
        </button>
      </div>
    </header>
  );
};