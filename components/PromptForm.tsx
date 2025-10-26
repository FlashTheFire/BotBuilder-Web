
import React from 'react';
import { InfoIcon } from './icons/InfoIcon';
import { InfoTooltip } from './InfoTooltip';
import type { BotLibrary } from '../types';

interface PromptFormProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  token: string;
  setToken: (token: string) => void;
  library: BotLibrary;
  setLibrary: (library: BotLibrary) => void;
  onBuild: () => void;
  isBuilding: boolean;
}

export const PromptForm: React.FC<PromptFormProps> = ({ prompt, setPrompt, token, setToken, library, setLibrary, onBuild, isBuilding }) => {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onBuild(); }} className="space-y-6">
      <div>
        <label htmlFor="prompt" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
          1. Describe your bot
        </label>
        <textarea
          id="prompt"
          name="prompt"
          rows={6}
          className="block w-full bg-secondary-light dark:bg-secondary-dark border-tertiary-light dark:border-tertiary-dark rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm placeholder-text-secondary-light dark:placeholder-text-secondary-dark p-3"
          placeholder="e.g., 'A bot that sends a daily joke at 8 AM' or 'A trivia quiz bot with a leaderboard'"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isBuilding}
        />
      </div>
      <div>
        <div className="flex items-center mb-2">
            <label htmlFor="token" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
              2. Enter your Telegram Bot Token
            </label>
            <InfoTooltip text={<span>You can get your unique bot token by talking to <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">@BotFather</a> on Telegram. It is required to connect your bot to the Telegram API.</span>}>
                <InfoIcon className="w-4 h-4 ml-2 text-gray-400 cursor-pointer" />
            </InfoTooltip>
        </div>
        <input
          type="password"
          id="token"
          name="token"
          className="block w-full bg-secondary-light dark:bg-secondary-dark border-tertiary-light dark:border-tertiary-dark rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-3"
          placeholder="Get this from @BotFather on Telegram"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          disabled={isBuilding}
        />
      </div>
       <div>
        <label htmlFor="library" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
          3. (Optional) Choose a Library
        </label>
        <select
          id="library"
          name="library"
          value={library}
          onChange={(e) => setLibrary(e.target.value as BotLibrary)}
          disabled={isBuilding}
          className="block w-full bg-secondary-light dark:bg-secondary-dark border-tertiary-light dark:border-tertiary-dark rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-3"
        >
          <option value="python-telegram-bot">python-telegram-bot (Recommended)</option>
          <option value="aiogram">aiogram (Async)</option>
          <option value="pyTelegramBotAPI">pyTelegramBotAPI (Simple)</option>
        </select>
      </div>
      <div>
        <button
          type="submit"
          disabled={isBuilding || !prompt || !token}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary-light dark:focus:ring-offset-primary-dark focus:ring-blue-500 disabled:bg-gray-400 dark:disabled:bg-tertiary-dark disabled:cursor-not-allowed transition-colors"
        >
          {isBuilding ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Building...
            </>
          ) : 'Build My Bot'}
        </button>
      </div>
    </form>
  );
};
