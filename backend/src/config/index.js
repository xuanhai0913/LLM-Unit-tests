import dotenv from 'dotenv';
dotenv.config();

const config = {
    // Server
    port: parseInt(process.env.PORT || '8000'),
    nodeEnv: process.env.NODE_ENV || 'development',

    // Frontend URL (for OAuth redirects)
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

    // JWT Configuration
    jwt: {
        secret: process.env.JWT_SECRET,
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
    },

    // Google OAuth
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:8000/api/auth/google/callback',
    },

    // LLM Provider Selection
    llm: {
        provider: process.env.LLM_PROVIDER || 'gemini',
        apiKey: process.env.LLM_API_KEY || process.env.GEMINI_API_KEY || process.env.DEEPSEEK_API_KEY,
        model: process.env.LLM_MODEL || 'gemini-2.0-flash',
    },

    // Deepseek API
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

    // API Key Encryption
    encryption: {
        key: process.env.ENCRYPTION_KEY,
    },
};

// Validate required config
export function validateConfig() {
    const missing = [];

    if (!config.jwt.secret) missing.push('JWT_SECRET');
    if (!config.jwt.refreshSecret) missing.push('JWT_REFRESH_SECRET');
    if (!config.encryption.key) missing.push('ENCRYPTION_KEY');

    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:', missing.join(', '));
        console.error('   Please check your .env file');
    }

    if (!config.llm.apiKey) {
        console.warn('⚠️  Warning: No LLM API key set. Please set GEMINI_API_KEY or DEEPSEEK_API_KEY in .env');
    }

    if (!config.google.clientId || !config.google.clientSecret) {
        console.warn('⚠️  Warning: Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET for OAuth login.');
    }
}

export default config;


