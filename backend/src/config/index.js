import dotenv from 'dotenv';
dotenv.config();

const config = {
    // Server
    port: parseInt(process.env.PORT || '8000'),
    nodeEnv: process.env.NODE_ENV || 'development',

    // LLM Provider Selection
    llm: {
        provider: process.env.LLM_PROVIDER || 'gemini', // 'deepseek' or 'gemini'
        apiKey: process.env.LLM_API_KEY || process.env.GEMINI_API_KEY || process.env.DEEPSEEK_API_KEY,
        model: process.env.LLM_MODEL || 'gemini-2.0-flash',
    },

    // Deepseek API (legacy support)
    deepseek: {
        apiKey: process.env.DEEPSEEK_API_KEY,
        apiUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1',
        model: process.env.DEEPSEEK_MODEL || 'deepseek-coder',
    },

    // Google Gemini API
    gemini: {
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    },

    // Generation Settings
    generation: {
        maxTokens: parseInt(process.env.MAX_TOKENS || '4096'),
        temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
        topP: parseFloat(process.env.TOP_P || '0.95'),
    },

    // Database
    database: {
        url: process.env.DATABASE_URL || 'sqlite:./database.sqlite',
    },
};

// Validate required config
export function validateConfig() {
    if (!config.llm.apiKey) {
        console.warn('⚠️  Warning: No API key set. Please set GEMINI_API_KEY or DEEPSEEK_API_KEY in .env');
    }
}

export default config;
