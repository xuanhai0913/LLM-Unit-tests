import axios from 'axios';
import config from '../config/index.js';

/**
 * Deepseek API Client for communicating with the LLM service.
 */
class DeepseekClient {
    constructor() {
        this.apiKey = config.deepseek.apiKey;
        this.apiUrl = config.deepseek.apiUrl;
        this.model = config.deepseek.model;
        this.maxRetries = 3;

        // Debug logging
        console.log('🔧 Deepseek Config:');
        console.log(`   API URL: ${this.apiUrl}`);
        console.log(`   Model: ${this.model}`);
        console.log(`   API Key: ${this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'NOT SET'}`);

        this.client = axios.create({
            baseURL: this.apiUrl,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            timeout: 120000, // 120 seconds for long generations
        });
    }

    /**
     * Generate text using Deepseek API
     * @param {string} prompt - Input prompt
     * @param {object} options - Optional parameters
     * @returns {Promise<string>} Generated text
     */
    async generateText(prompt, options = {}) {
        const maxTokens = options.maxTokens || config.generation.maxTokens;
        const temperature = options.temperature || config.generation.temperature;
        const topP = options.topP || config.generation.topP;

        const payload = {
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens,
            temperature: temperature,
            top_p: topP,
        };

        return this._makeRequest(payload);
    }

    /**
     * Make API request with retry logic
     * @private
     */
    async _makeRequest(payload, attempt = 1) {
        try {
            console.log(` API request attempt ${attempt}/${this.maxRetries}`);

            const response = await this.client.post('/chat/completions', payload);

            if (response.data?.choices?.[0]?.message?.content) {
                return response.data.choices[0].message.content;
            }

            throw new Error('Unexpected API response format');
        } catch (error) {
            console.error(` API request failed: ${error.message}`);

            if (attempt < this.maxRetries) {
                const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                console.log(` Retrying in ${delay / 1000}s...`);
                await this._sleep(delay);
                return this._makeRequest(payload, attempt + 1);
            }

            throw new Error(`API request failed after ${this.maxRetries} attempts: ${error.message}`);
        }
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Singleton instance
const deepseekClient = new DeepseekClient();

export default deepseekClient;
export { DeepseekClient };
