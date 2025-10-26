
import { GoogleGenAI } from "@google/genai";
import type { GeneratedFile, BotLibrary } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = "gemini-2.5-pro";

const callGemini = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                temperature: 0.2,
            }
        });
        const text = response.text.trim();
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```|({[\s\S]*})|(\[[\s\S]*])/);
        if (jsonMatch) {
            return jsonMatch[1] || jsonMatch[2] || jsonMatch[3];
        }
        return text;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to get a valid response from AI. Please check your API key and prompt.");
    }
};

export const checkForRequiredInputs = (userPrompt: string): Promise<string> => {
    const prompt = `Analyze the user's request for a Telegram bot: "${userPrompt}". Determine if any additional secret keys, API tokens, user IDs, or configuration values are required. 
    IMPORTANT: NEVER ask for the 'Telegram Bot Token' as the user has already provided it.
    If no extra inputs are needed, return a JSON object with an empty array: {"required_inputs": []}.
    If inputs are needed, return a JSON object listing them. For each input, decide if it's truly required for the bot's core function. For example, a database URL might be optional if there's a fallback.
    Use this exact schema: {"required_inputs": [{"name": "INPUT_NAME_IN_CAPS", "label": "User-Friendly Label", "type": "text", "description": "A brief explanation.", "required": true/false}]}.
    Only use 'password' for sensitive data like API keys.`;
    return callGemini(prompt);
};

const createDataString = (data: Record<string, string>) => {
    if (Object.keys(data).length === 0) return "No additional information was provided.";
    return `The user has provided the following additional information/keys: ${JSON.stringify(data)}. Use these values where appropriate in the code, for example, by reading them from environment variables that match the key names.`;
};

export const generateStructure = (userPrompt: string, additionalData: Record<string, string>, library: BotLibrary): Promise<string> => {
    const additionalDataString = createDataString(additionalData);
    const prompt = `You are an expert Telegram bot architect using Python and the ${library} library. The user wants a bot described as: "${userPrompt}". ${additionalDataString}.
    Design a modular, professional file structure. All Python source code MUST go inside a 'src/' directory. Include a root 'README.md' for instructions.
    Come up with a creative and fitting Telegram username for this bot (e.g., @QuizMasterBot, @DailyJokeSender).
    The structure should always include 'src/main.py', 'src/config.py', and 'src/handlers.py'. Add other files like 'src/utils.py' or 'src/database.py' only if necessary.
    Analyze the prompt for features: handlers, external APIs, storage (SQLite), scheduling (APScheduler), etc.
    Proactively include commonly required packages like 'requests' or 'aiohttp' in the requirements if the prompt implies any web requests to prevent future errors.
    
    Output ONLY a valid JSON object in this exact schema:
    {
      "files": [
        {"name": "src/filename.py", "purpose": "brief description", "is_required": true},
        ...
      ],
      "requirements": ["package1==version", ...],
      "run_cmd": "python src/main.py",
      "docker_entry": ["python", "src/main.py"],
      "estimated_complexity": "low/medium/high",
      "bot_username": "@YourBotName"
    }
    
    Ensure the file paths are correct (e.g., "src/main.py"). The 'run_cmd' and 'docker_entry' must reflect this structure. Do not generate code yet.`;
    return callGemini(prompt);
};

export const generateFileCode = (userPrompt: string, additionalData: Record<string, string>, structureJson: string, file: { name: string, purpose: string }, library: BotLibrary): Promise<string> => {
    const additionalDataString = createDataString(additionalData);
    const prompt = `You are a senior Python developer for Telegram bots, specializing in the ${library} library.
    User prompt: "${userPrompt}".
    User-provided data: ${additionalDataString}.
    Overall structure: ${structureJson}.
    
    Now, write the full, production-ready Python code for the file: \`${file.name}\` (purpose: ${file.purpose}).
    
    IMPORTANT: Since all code is in the 'src/' directory, use relative imports for local modules (e.g., \`from . import handlers\`, \`from .config import BOT_TOKEN\`).
    For \`main.py\`, load the token and other keys from \`os.getenv()\`, set up the application/dispatcher, add handlers, and start polling.
    For \`handlers.py\`, define async handler functions using the correct syntax for ${library}.
    Incorporate all features from the user prompt. Add logging and proper error handling. Keep code clean, commented, and under 500 lines.
    
    Output ONLY a valid JSON object in this exact schema:
    {
      "file_name": "${file.name}",
      "code": "full indented Python code as a string",
      "notes": "any setup instructions or notes"
    }
    
    Ensure the code is bug-free, compatible with Python 3.10+, and uses only the listed requirements.`;
    return callGemini(prompt);
};

export const generateSetupFiles = (userPrompt: string, additionalData: Record<string, string>, structureJson: string, library: BotLibrary): Promise<string> => {
    const additionalDataString = createDataString(additionalData);
    const library_req = library === 'python-telegram-bot' ? 'python-telegram-bot>=20.0' : library;
    const prompt = `Given the bot structure: ${structureJson}, user prompt: "${userPrompt}", data: ${additionalDataString}, and chosen library: ${library}, generate a \`requirements.txt\` and a \`Dockerfile\`.
    For \`requirements.txt\`, include \`${library_req}\` and all other necessary packages (e.g., requests, aiosqlite).
    For the \`Dockerfile\`, use a \`python:3.12-slim\` base image. The working directory should be \`/app\`. Copy all files and install dependencies. The final command must be \`CMD ["python", "src/main.py"]\` to match the project structure.
    
    Output ONLY a valid JSON object in this exact schema:
    {
      "requirements_txt": "exact content of requirements.txt",
      "dockerfile": "full content of Dockerfile",
      "install_cmd": "pip install -r requirements.txt"
    }`;
    return callGemini(prompt);
};

export const debugCode = (userPrompt: string, additionalData: Record<string, string>, currentFiles: GeneratedFile[], errorLog: string, library: BotLibrary): Promise<string> => {
    const additionalDataString = createDataString(additionalData);
    const currentFilesJson = JSON.stringify(currentFiles.map(f => ({ name: f.name, code: f.code })));
    const prompt = `You are a debugging expert for Python Telegram bots using the ${library} library.
    Original prompt: "${userPrompt}".
    Additional data: ${additionalDataString}.
    Current project files (note the 'src/' structure): ${currentFilesJson}.
    The bot failed with this error log: ${errorLog}.
    
    Analyze the root cause (e.g., syntax error, missing import, incorrect relative import based on the ${library} conventions). Propose a surgical fix by editing ONLY the necessary files.
    If a module is missing, add it to 'requirements.txt' and import it where needed.
    
    Output ONLY a valid JSON object in this exact schema:
    {
      "fixed_files": [
        {"name": "path/to/filename.py", "code": "full new code string", "changes_summary": "brief bullet points of diffs"}
      ],
      "updated_requirements": ["new packages if any"],
      "retry_cmd": "python src/main.py"
    }
    
    Keep changes minimal to avoid regressions.`;
    return callGemini(prompt);
};
