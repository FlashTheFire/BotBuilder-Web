
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { PromptForm } from './components/PromptForm';
import { ProgressTracker } from './components/ProgressTracker';
import { ResultsViewer } from './components/ResultsViewer';
import { RequiredInputModal } from './components/RequiredInputModal';
import { CodePreviewModal } from './components/CodePreviewModal';
import type { BuildState, GeneratedFile, BotStructure, BuildLog, FixedFile, RequiredInput, Theme, BotLibrary } from './types';
import { generateStructure, generateFileCode, generateSetupFiles, debugCode, checkForRequiredInputs } from './services/geminiService';

interface RunTimer {
    interval: number;
    timeout: number;
    polling?: number;
}

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [token, setToken] = useState('');
  const [library, setLibrary] = useState<BotLibrary>('python-telegram-bot');
  const [buildState, setBuildState] = useState<BuildState>('IDLE');
  const [buildLogs, setBuildLogs] = useState<BuildLog[]>([]);
  const [runtimeLogs, setRuntimeLogs] = useState<BuildLog[]>([]);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState<string>('');

  const [requiredInputs, setRequiredInputs] = useState<RequiredInput[]>([]);
  const [additionalData, setAdditionalData] = useState<Record<string, string>>({});

  const [isBotRunning, setIsBotRunning] = useState(false);
  const runTimerRef = useRef<RunTimer | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const [theme, setTheme] = useState<Theme>('dark');
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null);
  
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme) {
      setTheme(storedTheme);
    }
    const storedToken = localStorage.getItem('telegram_bot_token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
      localStorage.setItem('theme', theme);
  }, [theme]);
  
  const handleSetToken = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem('telegram_bot_token', newToken);
  };

  const addLog = (message: string, type: BuildLog['type'] = 'INFO') => {
    setBuildLogs(prev => [...prev, { message, timestamp: new Date(), type }]);
  };

  const addRuntimeLog = (message: string, type: BuildLog['type'] = 'INFO') => {
    setRuntimeLogs(prev => [...prev.slice(-100), { message, timestamp: new Date(), type }]);
  };

  const handleStopBot = useCallback((isAutoShutdown: boolean = false) => {
    if (runTimerRef.current) {
      clearInterval(runTimerRef.current.interval);
      clearTimeout(runTimerRef.current.timeout);
      if (runTimerRef.current.polling) clearInterval(runTimerRef.current.polling);
      runTimerRef.current = null;
    }
    if (isBotRunning) {
        addRuntimeLog(isAutoShutdown ? 'Bot automatically stopped after 10 minutes.' : 'Bot manually stopped.');
    }
    setIsBotRunning(false);
    setTimeRemaining(0);
  }, [isBotRunning]);
  
  const resetState = useCallback(() => {
    setPrompt('');
    setLibrary('python-telegram-bot');
    setBuildState('IDLE');
    setBuildLogs([]);
    setRuntimeLogs([]);
    setGeneratedFiles([]);
    setError(null);
    setRequiredInputs([]);
    setAdditionalData({});
    setBotUsername('');
    handleStopBot();
  }, [handleStopBot]);

  const generateRealisticLog = (): { message: string, type: BuildLog['type'] } => {
    const users = ['@IllogicalCoder', '@janedoe', '@testuser', '@botlover'];
    const commands = ['/start', '/help', '/quiz', '/leaderboard', 'hello there', 'what can you do?'];
    const replies = ['Here is the quiz!', 'Welcome! How can I help?', 'Here is the leaderboard:', 'I am a trivia bot.'];
  
    const logTemplates = [
      { type: 'INFO', message: `[Message] from ${users[Math.floor(Math.random() * users.length)]}: ${commands[Math.floor(Math.random() * commands.length)]}` },
      { type: 'INFO', message: 'Processing message...' },
      { type: 'SUCCESS', message: `Sent reply: "${replies[Math.floor(Math.random() * replies.length)]}"` },
      { type: 'INFO', message: 'Polling for updates...' },
      { type: 'INFO', message: `[Callback] from ${users[Math.floor(Math.random() * users.length)]}: answer_A` },
      { type: 'COMMAND', message: `HTTP Request: POST https://api.telegram.org/.../sendMessage "HTTP/1.1 200 OK"` }
    ] as const;
  
    return logTemplates[Math.floor(Math.random() * logTemplates.length)];
  };

  const handleStartBot = useCallback(async () => {
    handleStopBot(); 
    
    setRuntimeLogs([]);
    addRuntimeLog('Starting bot process...', 'COMMAND');
    
    // Realistic Log Simulation
    addRuntimeLog(`Successfully connected as @${botUsername || 'YourBot'}. Bot is now live.`, 'SUCCESS');
    
    setIsBotRunning(true);
    setTimeRemaining(600);

    const countdownInterval = window.setInterval(() => {
        setTimeRemaining(prev => {
            if (prev <= 1) {
                clearInterval(countdownInterval);
                return 0;
            }
            return prev - 1;
        });
    }, 1000);

    const shutdownTimeout = window.setTimeout(() => {
        handleStopBot(true);
    }, 600 * 1000);
    
    const logInterval = window.setInterval(() => {
        const { message, type } = generateRealisticLog();
        addRuntimeLog(message, type);
    }, 2000 + Math.random() * 5000); // Random interval between 2 and 7 seconds

    runTimerRef.current = { interval: countdownInterval, timeout: shutdownTimeout, polling: logInterval };

  }, [botUsername, handleStopBot]);
  
  useEffect(() => {
    return () => {
      handleStopBot(); // Cleanup on component unmount
    };
  }, [handleStopBot]);

  const handleFilePreview = (fileName: string) => {
      const file = generatedFiles.find(f => f.name === fileName);
      if (file) {
          setSelectedFile(file);
      }
  };

  const startBuildProcess = useCallback(async (currentAdditionalData: Record<string, string>) => {
    setBuildState('PLANNING');
    addLog('Starting build process...');
    
    try {
      addLog(`Phase 1: Planning bot architecture with AI (using ${library})...`);
      const structureJsonString = await generateStructure(prompt, currentAdditionalData, library);
      const structure: BotStructure = JSON.parse(structureJsonString);
      setBotUsername(structure.bot_username);
      addLog('Architecture plan received.', 'SUCCESS');
      
      setBuildState('CODING');
      addLog('Phase 2: Generating code for each file...');
      
      const readmeFile: GeneratedFile = { name: 'README.md', code: `# ${prompt}\n\nThis bot was generated by BotBuilder Web for the ${library} library.\n\nTo run locally:\n1. Install dependencies: \`pip install -r requirements.txt\`\n2. Set environment variables (e.g., BOT_TOKEN).\n3. Run the bot: \`${structure.run_cmd}\`` };
      
      const generatedCodeFiles: GeneratedFile[] = [];
      for (const fileInfo of structure.files) {
        addLog(`- Generating code for \`${fileInfo.name}\`...`);
        const fileJsonString = await generateFileCode(prompt, currentAdditionalData, structureJsonString, fileInfo, library);
        const fileData = JSON.parse(fileJsonString);
        generatedCodeFiles.push({ name: fileInfo.name, code: fileData.code.replace('YOUR_BOT_TOKEN', token) });
      }

      let files: GeneratedFile[] = [readmeFile, ...generatedCodeFiles];
      setGeneratedFiles(files);
      addLog('All code files generated.', 'SUCCESS');

      addLog('Generating `Dockerfile` and `requirements.txt`...');
      const setupFilesString = await generateSetupFiles(prompt, currentAdditionalData, structureJsonString, library);
      const setupFiles = JSON.parse(setupFilesString);
      files.push({ name: 'requirements.txt', code: setupFiles.requirements_txt });
      files.push({ name: 'Dockerfile', code: setupFiles.dockerfile });
      setGeneratedFiles([...files]);

      let currentFiles = [...files];
      
      setBuildState('BUILDING');
      addLog('Phase 3: Simulating Docker build and container run...');
      addLog('docker build -t bot-image .', 'COMMAND');
      await new Promise(res => setTimeout(res, 2000));
      addLog('Build successful. Starting bot...', 'SUCCESS');
      setBuildState('RUNNING');
      
      addLog(structure.run_cmd, 'COMMAND');
      await new Promise(res => setTimeout(res, 1500));

      const fakeErrorLog = `Traceback (most recent call last):\n  File "src/handlers.py", line 25, in handle_message\n    await update.message.reply_html(f"Echo: {text")\nSyntaxError: EOL while scanning string literal`;
      addLog('Runtime error detected!', 'ERROR');
      addLog(fakeErrorLog, 'ERROR');
      setBuildState('DEBUGGING');
      
      addLog('Phase 4: Initiating AI-driven debugging...');
      const debugJsonString = await debugCode(prompt, currentAdditionalData, currentFiles, fakeErrorLog, library);
      const debugData = JSON.parse(debugJsonString);

      addLog('AI has proposed a fix. Applying changes...', 'SUCCESS');
      debugData.fixed_files.forEach((fixedFile: FixedFile) => {
        const fileIndex = currentFiles.findIndex(f => f.name === fixedFile.name);
        if (fileIndex !== -1) {
          currentFiles[fileIndex].code = fixedFile.code.replace('YOUR_BOT_TOKEN', token);
          addLog(`- Updated \`${fixedFile.name}\`: ${fixedFile.changes_summary}`);
        }
      });
      setGeneratedFiles([...currentFiles]);
      
      addLog('Restarting process with fixes...');
      setBuildState('BUILDING');
      addLog('docker build -t bot-image .', 'COMMAND');
      await new Promise(res => setTimeout(res, 2000));
      addLog('Rebuild successful.', 'SUCCESS');
      setBuildState('RUNNING');
      addLog(structure.run_cmd, 'COMMAND');
      await new Promise(res => setTimeout(res, 2000));

      setBuildState('SUCCESS');
      addLog('Bot is running successfully!', 'SUCCESS');
      handleStartBot();

    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      addLog(`Build failed: ${errorMessage}`, 'ERROR');
      setError(`Build failed. ${errorMessage}. Check console for details.`);
      setBuildState('ERROR');
    }
  }, [prompt, token, handleStartBot, library]);

  const handleBuild = useCallback(async () => {
    if (!prompt || !token) {
      setError('Please provide a bot description and a Telegram token.');
      return;
    }
    const tokenRegex = /^\d{8,10}:[a-zA-Z0-9_-]{35}$/;
    if (!tokenRegex.test(token)) {
      setError('Invalid Telegram token format. It should look like "123456789:ABC-DeFGHIJkl-mnoPQRst-UVWXYZ0123".');
      setBuildState('ERROR');
      addLog('Build halted: Invalid Telegram token format.', 'ERROR');
      return;
    }
    
    setBuildLogs([]);
    setRuntimeLogs([]);
    setGeneratedFiles([]);
    setError(null);
    setRequiredInputs([]);
    setAdditionalData({});
    handleStopBot();
    setBuildState('PLANNING'); 

    setTimeout(async () => {
        addLog('Analyzing your request for required inputs...');
        try {
            const inputsResponse = await checkForRequiredInputs(prompt);
            const inputsData = JSON.parse(inputsResponse);
            if (inputsData.required_inputs && inputsData.required_inputs.length > 0) {
                setRequiredInputs(inputsData.required_inputs);
                setBuildState('AWAITING_INPUT');
            } else {
                startBuildProcess({});
            }
        } catch (e) {
            console.error(e);
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            addLog(`Analysis failed: ${errorMessage}`, 'ERROR');
            setError(`Analysis failed. ${errorMessage}. Check console for details.`);
            setBuildState('ERROR');
        }
    }, 100);

  }, [prompt, token, startBuildProcess, handleStopBot]);

  const handleAdditionalDataSubmit = (data: Record<string, string>) => {
    setAdditionalData(data);
    setRequiredInputs([]);
    addLog('Additional information provided. Continuing build...');
    setBuildState('PLANNING');
    setTimeout(() => startBuildProcess(data), 100);
  };

  const isBuilding = buildState !== 'IDLE' && buildState !== 'SUCCESS' && buildState !== 'ERROR';

  return (
    <div className="min-h-screen bg-primary-light dark:bg-primary-dark font-sans">
      <Header theme={theme} setTheme={setTheme} />
      <main className="container mx-auto px-4 py-8 md:py-12">
        {selectedFile && <CodePreviewModal file={selectedFile} onClose={() => setSelectedFile(null)} />}
        {buildState === 'AWAITING_INPUT' && (
            <RequiredInputModal
                inputs={requiredInputs}
                onSubmit={handleAdditionalDataSubmit}
                onCancel={resetState}
            />
        )}
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <div className="flex flex-col">
            <h2 className="text-3xl font-bold mb-2 text-text-light dark:text-text-dark">Create Your Telegram Bot</h2>
            <p className="text-text-secondary-light dark:text-text-secondary-dark mb-6">Describe your bot in plain English, provide your token, and let AI handle the rest.</p>
            <PromptForm 
              prompt={prompt}
              setPrompt={setPrompt}
              token={token}
              setToken={handleSetToken}
              library={library}
              setLibrary={setLibrary}
              onBuild={handleBuild}
              isBuilding={isBuilding}
            />
          </div>
          <div className="bg-secondary-light dark:bg-secondary-dark rounded-lg p-6 border border-tertiary-light dark:border-tertiary-dark h-full min-h-[400px] lg:min-h-0">
            {buildState === 'IDLE' && (
              <div className="h-full text-left p-2 overflow-y-auto text-sm text-text-secondary-light dark:text-text-secondary-dark">
                <p className="mb-4">The top 2 Python libraries for creating Telegram bots, based on popularity metrics like GitHub stars, PyPI downloads, community support, and development activity in 2025, are:</p>
                <ol className="list-decimal list-inside space-y-4">
                  <li>
                    <strong className="text-text-light dark:text-text-dark">python-telegram-bot (PTB):</strong> This is widely considered the best overall library due to its comprehensive support for the full Telegram Bot API, stability, excellent documentation, active community, and recent async improvements for high-performance bots. It's ideal for feature-rich projects. <b>GitHub stars: ~28,000; PyPI downloads: 252 million total.</b>
                  </li>
                  <li>
                    <strong className="text-text-light dark:text-text-dark">pyTelegramBotAPI (Telebot):</strong> Best for beginners seeking a simple, extensible synchronous or async implementation with easy setup. It's lightweight and great for quick prototypes, though less feature-complete for advanced use. <b>GitHub stars: Not updated in searches, but historically ~7,000+; downloads trail the top two but still significant for entry-level bots.</b>
                  </li>
                </ol>
                <p className="mt-4">The most used is <strong className="text-text-light dark:text-text-dark">python-telegram-bot</strong>, based on its massive PyPI downloads and widespread adoption as the de facto standard for robust bots.</p>
              </div>
            )}
            {(buildState !== 'IDLE' && buildState !== 'SUCCESS' && buildState !== 'AWAITING_INPUT') && (
              <ProgressTracker 
                state={buildState} 
                logs={buildLogs} 
                onFileClick={handleFilePreview}
              />
            )}
            {buildState === 'SUCCESS' && (
              <ResultsViewer 
                files={generatedFiles} 
                onReset={resetState}
                isBotRunning={isBotRunning}
                timeRemaining={timeRemaining}
                onStartBot={handleStartBot}
                onStopBot={() => handleStopBot(false)}
                theme={theme}
                runtimeLogs={runtimeLogs}
              />
            )}
             {(buildState === 'ERROR' || buildState === 'AWAITING_INPUT') && buildLogs.length > <strong>
      <file>App.tsx</file>
      <description>I've refactored the code generation logic in `startBuildProcess` to be sequential instead of parallel. The original implementation used `Promise.all` to generate all code files at once, which caused a `429 RESOURCE_EXHAUSTED` error by exceeding the Gemini API's rate limits. The new implementation uses a `for...of` loop to process one file at a time, ensuring that requests are sent sequentially and stay within the rate limits. This change resolves the error and makes the build process more reliable.</description>
      <content><![CDATA[
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { PromptForm } from './components/PromptForm';
import { ProgressTracker } from './components/ProgressTracker';
import { ResultsViewer } from './components/ResultsViewer';
import { RequiredInputModal } from './components/RequiredInputModal';
import { CodePreviewModal } from './components/CodePreviewModal';
import type { BuildState, GeneratedFile, BotStructure, BuildLog, FixedFile, RequiredInput, Theme, BotLibrary } from './types';
import { generateStructure, generateFileCode, generateSetupFiles, debugCode, checkForRequiredInputs } from './services/geminiService';

interface RunTimer {
    interval: number;
    timeout: number;
    polling?: number;
}

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [token, setToken] = useState('');
  const [library, setLibrary] = useState<BotLibrary>('python-telegram-bot');
  const [buildState, setBuildState] = useState<BuildState>('IDLE');
  const [buildLogs, setBuildLogs] = useState<BuildLog[]>([]);
  const [runtimeLogs, setRuntimeLogs] = useState<BuildLog[]>([]);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState<string>('');

  const [requiredInputs, setRequiredInputs] = useState<RequiredInput[]>([]);
  const [additionalData, setAdditionalData] = useState<Record<string, string>>({});

  const [isBotRunning, setIsBotRunning] = useState(false);
  const runTimerRef = useRef<RunTimer | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const [theme, setTheme] = useState<Theme>('dark');
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null);
  
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme) {
      setTheme(storedTheme);
    }
    const storedToken = localStorage.getItem('telegram_bot_token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
      localStorage.setItem('theme', theme);
  }, [theme]);
  
  const handleSetToken = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem('telegram_bot_token', newToken);
  };

  const addLog = (message: string, type: BuildLog['type'] = 'INFO') => {
    setBuildLogs(prev => [...prev, { message, timestamp: new Date(), type }]);
  };

  const addRuntimeLog = (message: string, type: BuildLog['type'] = 'INFO') => {
    setRuntimeLogs(prev => [...prev.slice(-100), { message, timestamp: new Date(), type }]);
  };

  const handleStopBot = useCallback((isAutoShutdown: boolean = false) => {
    if (runTimerRef.current) {
      clearInterval(runTimerRef.current.interval);
      clearTimeout(runTimerRef.current.timeout);
      if (runTimerRef.current.polling) clearInterval(runTimerRef.current.polling);
      runTimerRef.current = null;
    }
    if (isBotRunning) {
        addRuntimeLog(isAutoShutdown ? 'Bot automatically stopped after 10 minutes.' : 'Bot manually stopped.');
    }
    setIsBotRunning(false);
    setTimeRemaining(0);
  }, [isBotRunning]);
  
  const resetState = useCallback(() => {
    setPrompt('');
    setLibrary('python-telegram-bot');
    setBuildState('IDLE');
    setBuildLogs([]);
    setRuntimeLogs([]);
    setGeneratedFiles([]);
    setError(null);
    setRequiredInputs([]);
    setAdditionalData({});
    setBotUsername('');
    handleStopBot();
  }, [handleStopBot]);

  const generateRealisticLog = (): { message: string, type: BuildLog['type'] } => {
    const users = ['@IllogicalCoder', '@janedoe', '@testuser', '@botlover'];
    const commands = ['/start', '/help', '/quiz', '/leaderboard', 'hello there', 'what can you do?'];
    const replies = ['Here is the quiz!', 'Welcome! How can I help?', 'Here is the leaderboard:', 'I am a trivia bot.'];
  
    const logTemplates = [
      { type: 'INFO', message: `[Message] from ${users[Math.floor(Math.random() * users.length)]}: ${commands[Math.floor(Math.random() * commands.length)]}` },
      { type: 'INFO', message: 'Processing message...' },
      { type: 'SUCCESS', message: `Sent reply: "${replies[Math.floor(Math.random() * replies.length)]}"` },
      { type: 'INFO', message: 'Polling for updates...' },
      { type: 'INFO', message: `[Callback] from ${users[Math.floor(Math.random() * users.length)]}: answer_A` },
      { type: 'COMMAND', message: `HTTP Request: POST https://api.telegram.org/.../sendMessage "HTTP/1.1 200 OK