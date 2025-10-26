
import React, { useState, useMemo, Suspense, lazy, useCallback, useRef, useEffect } from 'react';
import type { GeneratedFile, Theme, BuildLog } from '../types';

const Editor = lazy(() => import('@monaco-editor/react'));

declare const JSZip: any;
declare const saveAs: any;

interface ResultsViewerProps {
  files: GeneratedFile[];
  onReset: () => void;
  isBotRunning: boolean;
  timeRemaining: number;
  onStartBot: () => void;
  onStopBot: () => void;
  theme: Theme;
  runtimeLogs: BuildLog[];
}

interface FileTreeNode {
    name: string;
    type: 'file' | 'folder';
    path: string;
    children?: { [key: string]: FileTreeNode };
}

const buildFileTree = (files: GeneratedFile[]): FileTreeNode => {
    const root: FileTreeNode = { name: 'root', type: 'folder', path: '', children: {} };

    files.forEach(file => {
        const parts = file.name.split('/');
        let currentNode = root;

        parts.forEach((part, index) => {
            if (!currentNode.children) {
                currentNode.children = {};
            }
            if (!currentNode.children[part]) {
                const isFile = index === parts.length - 1;
                currentNode.children[part] = {
                    name: part,
                    type: isFile ? 'file' : 'folder',
                    path: parts.slice(0, index + 1).join('/'),
                    ...(isFile ? {} : { children: {} })
                };
            }
            currentNode = currentNode.children[part];
        });
    });

    return root;
};

const FileTree: React.FC<{ node: FileTreeNode; onFileSelect: (path: string) => void; activeFile: string; level?: number }> = ({ node, onFileSelect, activeFile, level = 0 }) => {
    const [isOpen, setIsOpen] = useState(level === 0 || node.name === 'src');

    if (node.type === 'file') {
        return (
            <div
                className={`pl-${level * 4} py-1 px-2 cursor-pointer rounded-md truncate ${activeFile === node.path ? 'bg-blue-500/20 text-blue-300' : 'hover:bg-tertiary-dark'}`}
                onClick={() => onFileSelect(node.path)}
            >
                📄 {node.name}
            </div>
        );
    }

    return (
        <div className={`pl-${level * 4}`}>
            <div
                className="py-1 px-2 cursor-pointer flex items-center"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{isOpen ? '📂' : '📁'}</span>
                <span className="ml-2 font-semibold">{node.name}</span>
            </div>
            {isOpen && node.children && (
                <div>
                    {Object.values(node.children)
                        .sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))
                        .map(child => (
                            <FileTree key={child.path} node={child} onFileSelect={onFileSelect} activeFile={activeFile} level={level + 1} />
                        ))}
                </div>
            )}
        </div>
    );
};

const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const getLogColor = (type?: BuildLog['type']) => {
    switch (type) {
        case 'ERROR': return 'text-red-400';
        case 'SUCCESS': return 'text-green-400';
        case 'COMMAND': return 'text-cyan-400';
        default: return 'text-text-secondary-light dark:text-text-secondary-dark';
    }
};

export const ResultsViewer: React.FC<ResultsViewerProps> = ({ files, onReset, isBotRunning, timeRemaining, onStartBot, onStopBot, theme, runtimeLogs }) => {
  const [activeFile, setActiveFile] = useState(files.find(f => f.name.endsWith('main.py'))?.name || (files.length > 0 ? files[0].name : ''));
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeView, setActiveView] = useState<'files' | 'logs'>('files');
  const [sidebarWidth, setSidebarWidth] = useState(33.33);
  const [isResizing, setIsResizing] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const resizablePanelRef = useRef<HTMLDivElement>(null);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
      if (isResizing && resizablePanelRef.current) {
        const parent = resizablePanelRef.current;
        if (parent) {
            const newWidth = mouseMoveEvent.clientX - parent.getBoundingClientRect().left;
            const newWidthPercent = (newWidth / parent.offsetWidth) * 100;
            setSidebarWidth(Math.max(20, Math.min(newWidthPercent, 60)));
        }
      }
    }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const fileTree = useMemo(() => buildFileTree(files), [files]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
        const zip = new JSZip();
        files.forEach(file => {
            zip.file(file.name, file.code);
        });
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, 'telegram-bot.zip');
    } catch (e) {
        console.error("Failed to create zip file", e);
        alert("Sorry, there was an error creating the zip file.");
    } finally {
        setIsDownloading(false);
    }
  };

  const currentFile = files.find(f => f.name === activeFile);
  const getLanguage = (fileName: string) => {
    const name = fileName.toLowerCase();
    if (name === 'dockerfile') return 'dockerfile';
    const extension = name.split('.').pop();
    switch (extension) {
      case 'py': return 'python';
      case 'md': return 'markdown';
      case 'txt': case 'gitignore': case 'example':
      default: return 'plaintext';
    }
  };

  const editorLoadingFallback = <div className="flex items-center justify-center h-full bg-primary-dark text-text-secondary-dark">Loading Editor...</div>;
  
  const RuntimeLogViewer: React.FC = () => {
      const logScrollerRef = useRef<HTMLDivElement>(null);
      useEffect(() => {
        if (logScrollerRef.current) {
          logScrollerRef.current.scrollTop = logScrollerRef.current.scrollHeight;
        }
      }, [runtimeLogs]);

      return (
        <div ref={logScrollerRef} className="flex-1 bg-primary-dark p-4 rounded-md overflow-y-auto font-mono text-xs text-text-secondary-dark space-y-2 border border-tertiary-dark">
           {runtimeLogs.map((log, index) => (
               <div key={index} className={`flex items-start ${getLogColor(log.type)}`}>
                   <span className="mr-2 text-gray-500 dark:text-gray-600 flex-shrink-0">{log.timestamp.toLocaleTimeString()}</span>
                   <div className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                       {log.type === 'COMMAND' && <span className="select-none mr-1 text-cyan-400/50">$</span>}
                       {log.message}
                   </div>
               </div>
           ))}
        </div>
      );
  }

  return (
    <div className="flex flex-col h-full">
        <div className="text-center mb-4">
            <div className="inline-block bg-green-500/10 p-3 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-xl font-semibold mt-2">Build Successful!</h3>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Your bot is ready. Explore the files or start a trial run.</p>
        </div>

        <div className="bg-primary-light dark:bg-secondary-dark p-4 rounded-lg mb-4 flex items-center justify-between border border-tertiary-light dark:border-tertiary-dark">
            <div className="flex items-center space-x-3">
                <span className={`h-3 w-3 rounded-full ${isBotRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></span>
                <div>
                    <p className="font-semibold">{isBotRunning ? 'Bot is Running' : 'Bot is Stopped'}</p>
                    {isBotRunning && <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Auto-stops in: {formatTime(timeRemaining)}</p>}
                </div>
            </div>
            {isBotRunning ? (
                <button onClick={onStopBot} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md text-sm transition-colors">Stop</button>
            ) : (
                <button onClick={onStartBot} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md text-sm transition-colors">Start Trial</button>
            )}
        </div>

        <div className="flex items-center border-b border-tertiary-dark mb-2">
            <button onClick={() => setActiveView('files')} className={`py-2 px-4 text-sm font-medium ${activeView === 'files' ? 'border-b-2 border-blue-500 text-text-dark' : 'text-text-secondary-dark'}`}>Files</button>
            <button onClick={() => setActiveView('logs')} className={`py-2 px-4 text-sm font-medium ${activeView === 'logs' ? 'border-b-2 border-blue-500 text-text-dark' : 'text-text-secondary-dark'}`}>Live Logs</button>
            <div className="flex-1"></div>
             {activeView === 'files' && (
                <button 
                    onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                    className="p-2 text-sm text-text-secondary-dark hover:bg-tertiary-dark rounded-md"
                    title="Toggle file sidebar"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                </button>
            )}
        </div>
      
        <div className="flex-1 flex min-h-[300px] text-sm">
            {activeView === 'files' ? (
                <div ref={resizablePanelRef} className="flex w-full">
                    {isSidebarVisible && (
                        <div style={{ flexBasis: `${sidebarWidth}%` }} className="bg-primary-dark p-2 rounded-l-md overflow-y-auto">
                           {fileTree.children && Object.values(fileTree.children)
                                .sort((a, b) => b.type.localeCompare(a.type) || a.name.localeCompare(b.name))
                                .map(node => (
                                    <FileTree key={node.path} node={node} onFileSelect={setActiveFile} activeFile={activeFile} />
                                ))}
                        </div>
                    )}
                    {isSidebarVisible && (
                         <div 
                            className="w-1.5 cursor-col-resize bg-tertiary-dark hover:bg-blue-500 transition-colors flex-shrink-0"
                            onMouseDown={startResizing}
                         />
                    )}
                    <div className={`flex-1 bg-primary-dark ${isSidebarVisible ? 'rounded-r-md' : 'rounded-md'} overflow-hidden`}>
                        <Suspense fallback={editorLoadingFallback}>
                            {currentFile ? (
                                <Editor
                                    height="100%"
                                    language={getLanguage(currentFile.name)}
                                    value={currentFile.code}
                                    theme={theme === 'dark' ? 'vs-dark' : 'light'}
                                    options={{ readOnly: true, minimap: { enabled: false }, scrollBeyondLastLine: false, fontSize: 14, glyphMargin: true }}
                                    loading={editorLoadingFallback}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-text-secondary-dark">Select a file to view its content</div>
                            )}
                        </Suspense>
                    </div>
                </div>
            ) : (
                <RuntimeLogViewer />
            )}
        </div>
      
        <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex-1 w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-secondary-light dark:focus:ring-offset-secondary-dark focus:ring-green-500 disabled:bg-gray-600"
            >
                {isDownloading ? 'Zipping...' : 'Download .zip'}
            </button>
            <button
                onClick={onReset}
                className="flex-1 w-full flex justify-center items-center py-3 px-4 border border-tertiary-light dark:border-tertiary-dark rounded-md shadow-sm text-sm font-medium bg-secondary-light dark:bg-tertiary-dark hover:bg-tertiary-light dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-secondary-light dark:focus:ring-offset-secondary-dark focus:ring-blue-500"
            >
                Build Another Bot
            </button>
        </div>
    </div>
  );
};
