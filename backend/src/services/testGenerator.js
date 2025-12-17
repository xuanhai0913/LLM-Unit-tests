import llmClient from './llmClient.js';
import { buildTestGenerationPrompt, extractCodeBlocks } from '../utils/prompts.js';

/**
 * Test Generator Service
 * Core logic for generating unit tests from source code
 */
class TestGenerator {
    /**
     * Generate unit tests for provided source code
     * @param {object} params - Generation parameters
     * @param {string} params.code - Source code to test
     * @param {string} [params.specs] - Optional specifications
     * @param {string} [params.framework] - Test framework (default: pytest)
     * @param {string} [params.language] - Programming language (default: python)
     * @param {string} [params.provider] - LLM provider (gemini/deepseek)
     * @param {string} [params.userApiKey] - User's own API key
     * @returns {Promise<object>} Generated tests and metadata
     */
    async generateTests({ code, specs = '', framework = 'pytest', language = 'python', provider, userApiKey }) {
        if (!code || code.trim().length === 0) {
            throw new Error('Source code is required');
        }

        console.log(`📝 Generating ${framework} tests for ${language} code using ${provider || 'default'} provider...`);

        // Build the prompt
        const prompt = buildTestGenerationPrompt({
            code,
            specs,
            framework,
            language,
        });

        // Call LLM API with optional user key
        const startTime = Date.now();
        const rawResponse = await llmClient.generateText(prompt, {
            provider,
            userApiKey,
        });
        const generationTime = Date.now() - startTime;

        // Extract code from response
        const codeBlocks = extractCodeBlocks(rawResponse, language);
        const testCode = codeBlocks.length > 0 ? codeBlocks[0] : rawResponse;

        // Validate the generated code (basic check)
        const isValid = this._validateCode(testCode, language);

        console.log(`✅ Tests generated in ${generationTime}ms`);

        return {
            generatedTests: testCode,
            rawResponse,
            framework,
            language,
            generationTime,
            isValid,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Basic code validation
     * @private
     */
    _validateCode(code, language) {
        if (!code || code.trim().length === 0) {
            return false;
        }

        // Basic checks for common issues
        if (language === 'python') {
            // Check for Python test patterns
            return code.includes('def test_') ||
                code.includes('class Test') ||
                code.includes('assert ') ||
                code.includes('unittest');
        }

        if (language === 'javascript' || language === 'typescript') {
            // Check for JS test patterns
            return code.includes('describe(') ||
                code.includes('it(') ||
                code.includes('test(') ||
                code.includes('expect(');
        }

        return true; // Default to valid for unknown languages
    }
}

// Singleton instance
const testGenerator = new TestGenerator();

export default testGenerator;
export { TestGenerator };
