import axios from 'axios';
import config from '../config/index.js';

/**
 * Multi-provider LLM Client supporting Deepseek and Gemini
 */
class LLMClient {
    constructor() {
        this.maxRetries = 3;

        // Debug logging
        console.log('🔧 LLM Config:');
        console.log(`   Provider: ${config.llm.provider}`);
        console.log(`   Model: ${config.llm.model}`);
        console.log(`   API Key: ${config.llm.apiKey ? config.llm.apiKey.substring(0, 10) + '...' : 'NOT SET'}`);
    }

    /**
     * Generate text using the configured LLM provider
     */
    async generateText(prompt, options = {}) {
        const provider = options.provider || config.llm.provider;

        switch (provider.toLowerCase()) {
            case 'gemini':
                return this._callGemini(prompt, options);
            case 'deepseek':
            default:
                return this._callDeepseek(prompt, options);
        }
    }

    /**
     * Call Deepseek API
     */
    async _callDeepseek(prompt, options = {}) {
        const apiKey = config.deepseek.apiKey;
        const apiUrl = config.deepseek.apiUrl;
        const model = options.model || config.deepseek.model;

        const payload = {
            model: model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: options.maxTokens || config.generation.maxTokens,
            temperature: options.temperature || config.generation.temperature,
            top_p: options.topP || config.generation.topP,
        };

        return this._makeRequest({
            url: `${apiUrl}/chat/completions`,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            data: payload,
            provider: 'deepseek',
        });
    }

    /**
     * Call Google Gemini API
     */
    async _callGemini(prompt, options = {}) {
        const apiKey = config.gemini.apiKey;
        const model = options.model || config.gemini.model;

        const payload = {
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                maxOutputTokens: options.maxTokens || config.generation.maxTokens,
                temperature: options.temperature || config.generation.temperature,
                topP: options.topP || config.generation.topP,
            },
        };

        return this._makeRequest({
            url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            headers: {
                'Content-Type': 'application/json',
            },
            data: payload,
            provider: 'gemini',
        });
    }

    /**
     * Make API request with retry logic
     */
    async _makeRequest({ url, headers, data, provider }, attempt = 1) {
        try {
            console.log(`🔄 [${provider}] API request attempt ${attempt}/${this.maxRetries}`);

            const response = await axios.post(url, data, {
                headers,
                timeout: 120000,
            });

            // Parse response based on provider
            if (provider === 'gemini') {
                const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) return text;
            } else {
                // Deepseek/OpenAI format
                const text = response.data?.choices?.[0]?.message?.content;
                if (text) return text;
            }

            throw new Error('Unexpected API response format');
        } catch (error) {
            const statusCode = error.response?.status;
            const errorMsg = error.response?.data?.error?.message || error.message;

            console.error(`❌ [${provider}] API request failed: ${statusCode} - ${errorMsg}`);

            if (attempt < this.maxRetries && statusCode !== 401 && statusCode !== 402) {
                const delay = Math.pow(2, attempt) * 1000;
                console.log(`⏳ Retrying in ${delay / 1000}s...`);
                await this._sleep(delay);
                return this._makeRequest({ url, headers, data, provider }, attempt + 1);
            }

            throw new Error(`[${provider}] API request failed: ${statusCode} - ${errorMsg}`);
        }
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Singleton instance
const llmClient = new LLMClient();

export default llmClient;
export { LLMClient };
