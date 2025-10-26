
import React, { useEffect, useRef } from 'react';
import type { BuildState, BuildLog } from '../types';
import { PlanIcon } from './icons/PlanIcon';
import { CodeIcon } from './icons/CodeIcon';
import { RocketIcon } from './icons/RocketIcon';
import { PlayIcon } from './icons/PlayIcon';
import { DebugIcon } from './icons/DebugIcon';
import { Spinner } from './icons/Spinner';

interface ProgressTrackerProps {
  state: BuildState;
  logs: BuildLog[];
  onFileClick: (fileName: string) => void;
}

const steps = [
  { id: 'PLANNING', name: 'Planning', icon: PlanIcon },
  { id: 'CODING', name: 'Coding', icon: CodeIcon },
  { id: 'BUILDING', name: 'Building', icon: RocketIcon },
  { id: 'RUNNING', name: 'Running', icon: PlayIcon },
  { id: 'DEBUGGING', name: 'Debugging', icon: DebugIcon },
];

const stateToIndex = (state: BuildState): number => {
    switch (state) {
        case 'PLANNING': return 0;
        case 'CODING': return 1;
        case 'BUILDING': return 2;
        case 'RUNNING': return 3;
        case 'DEBUGGING': return 4;
        case 'SUCCESS': return 5;
        case 'ERROR': return -1;
        default: return -1;
    }
}

const getLogColor = (type?: BuildLog['type']) => {
    switch (type) {
        case 'ERROR': return 'text-red-400';
        case 'SUCCESS': return 'text-green-400';
        case 'COMMAND': return 'text-cyan-400';
        default: return 'text-text-secondary-light dark:text-text-secondary-dark';
    }
};

const Stepper: React.FC<{ state: BuildState }> = ({ state }) => {
    const currentIndex = stateToIndex(state);
    return (
        <div className="flex items-center space-x-2 md:space-x-4 mb-6">
            {steps.map((step, index) => {
                const isActive = currentIndex === index;
                const isCompleted = currentIndex > index;
                const isDebugging = state === 'DEBUGGING' && step.id === 'DEBUGGING';

                const getIconBgColor = () => {
                    if (isCompleted) return 'bg-green-500';
                    if (isDebugging) return 'bg-yellow-500';
                    if (isActive) return 'bg-blue-500';
                    return 'bg-gray-400 dark:bg-tertiary-dark';
                };

                const getIcon = () => {
                    if (isActive && !isDebugging) return <Spinner />;
                    if (isDebugging) return <DebugIcon className="w-6 h-6 text-white animate-pulse" />;
                    return <step.icon className="w-6 h-6 text-white" />;
                };

                return (
                    <React.Fragment key={step.id}>
                        <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${getIconBgColor()}`}>
                                {getIcon()}
                            </div>
                            <p className={`mt-2 text-xs text-center font-medium ${isActive || isCompleted ? 'text-text-light dark:text-text-dark' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>{step.name}</p>
                        </div>
                        {index < steps.length - 1 && <div className={`flex-1 h-1 transition-colors ${isCompleted ? 'bg-green-500' : 'bg-tertiary-light dark:bg-tertiary-dark'}`}></div>}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({ state, logs, onFileClick }) => {
  const logScrollerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (logScrollerRef.current) {
      logScrollerRef.current.scrollTop = logScrollerRef.current.scrollHeight;
    }
  }, [logs]);

  const renderLogMessage = (message: string) => {
    const fileRegex = /`([a-zA-Z0-9/._-]+)`/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = fileRegex.exec(message)) !== null) {
      if (match.index > lastIndex) {
        parts.push(message.substring(lastIndex, match.index));
      }
      const fileName = match[1];
      parts.push(
        <button
          key={`match-${lastIndex}`}
          onClick={() => onFileClick(fileName)}
          className="text-blue-400 hover:underline font-semibold bg-transparent border-none p-0 mx-px appearance-none cursor-pointer inline-block"
        >
          `{fileName}`
        </button>
      );
      lastIndex = fileRegex.lastIndex;
    }

    if (lastIndex < message.length) {
      parts.push(message.substring(lastIndex));
    }

    return <span className="whitespace-pre-wrap break-words">{parts.map((part, i) => <React.Fragment key={i}>{part}</React.Fragment>)}</span>;
  };
  
  return (
    <div className="flex flex-col h-full">
      <h3 className="text-xl font-semibold mb-4">Build Progress</h3>
      <Stepper state={state} />
      <div className="flex-1 bg-primary-light dark:bg-primary-dark rounded-md flex flex-col overflow-hidden min-h-[300px] border border-tertiary-light dark:border-tertiary-dark">
        <div className="flex-1 p-4 overflow-y-auto" ref={logScrollerRef}>
          <div className="font-mono text-xs space-y-2">
            {logs.map((log, index) => (
               <div key={index} className={`flex items-start ${getLogColor(log.type)}`}>
                  <span className="mr-2 text-gray-500 dark:text-gray-600 flex-shrink-0">{log.timestamp.toLocaleTimeString()}</span>
                  <div className="min-w-0 flex-1">
                      {log.type === 'COMMAND' && <span className="select-none mr-1 text-cyan-400/50">$</span>}
                      {renderLogMessage(log.message)}
                  </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
