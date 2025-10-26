
export type BuildState = 'IDLE' | 'AWAITING_INPUT' | 'PLANNING' | 'CODING' | 'BUILDING' | 'RUNNING' | 'DEBUGGING' | 'SUCCESS' | 'ERROR';

export type BotLibrary = 'python-telegram-bot' | 'aiogram' | 'pyTelegramBotAPI';

export interface GeneratedFile {
  name: string;
  code: string;
}

export interface FixedFile extends GeneratedFile {
  changes_summary: string;
}

export interface BotStructure {
  files: {
    name: string;
    purpose: string;
    is_required: boolean;
  }[];
  requirements: string[];
  run_cmd: string;
  docker_entry: string[];
  estimated_complexity: 'low' | 'medium' | 'high';
  bot_username: string;
}

export interface BuildLog {
    message: string;
    timestamp: Date;
    type?: 'INFO' | 'ERROR' | 'COMMAND' | 'SUCCESS';
}

export interface RequiredInput {
  name: string;
  label: string;
  type: 'text' | 'password';
  description: string;
  required?: boolean;
}

export type Theme = 'light' | 'dark';
