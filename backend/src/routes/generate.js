import express from 'express';
import CryptoJS from 'crypto-js';
import testGenerator from '../services/testGenerator.js';
import { Generation, User } from '../models/index.js';
import { optionalAuth } from '../middleware/authMiddleware.js';
import config from '../config/index.js';

const router = express.Router();

/**
 * Decrypt API key from storage
 */
function decryptKey(encryptedKey) {
    if (!encryptedKey) return null;
    const bytes = CryptoJS.AES.decrypt(encryptedKey, config.encryption.key);
    return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * POST /api/generate
 * Generate unit tests from source code
 * 
 * @body {string} code - Source code to test (required)
 * @body {string} [specs] - Optional specifications/requirements
 * @body {string} [framework] - Test framework (default: pytest)
 * @body {string} [language] - Programming language (default: python)
 * @body {boolean} [saveHistory] - Save to history (default: true)
 * @body {string} [llmProvider] - LLM provider to use (gemini/deepseek)
 * @body {string} [userApiKey] - User's own API key (optional, sent directly)
 */
router.post('/', optionalAuth, async (req, res, next) => {
    try {
        const {
            code,
            specs,
            framework = 'pytest',
            language = 'python',
            saveHistory = true,
            llmProvider,
            userApiKey,
        } = req.body;

        // Validate input
        if (!code || typeof code !== 'string' || code.trim().length === 0) {
            return res.status(400).json({
                error: 'Source code is required',
                field: 'code',
            });
        }

        // Determine which API key and provider to use
        let apiKeyToUse = null;
        let providerToUse = llmProvider || config.llm.provider;

        // Priority: 1. User provided key in request, 2. User's saved key, 3. System key
        if (userApiKey) {
            apiKeyToUse = userApiKey;
        } else if (req.user) {
            // Get user's saved API key
            const user = await User.findByPk(req.user.id);
            if (user) {
                // Use user's preferred provider if not specified
                if (!llmProvider) {
                    providerToUse = user.preferred_llm || config.llm.provider;
                }

                // Get user's API key for the selected provider
                if (providerToUse === 'gemini' && user.gemini_api_key) {
                    apiKeyToUse = decryptKey(user.gemini_api_key);
                } else if (providerToUse === 'deepseek' && user.deepseek_api_key) {
                    apiKeyToUse = decryptKey(user.deepseek_api_key);
                }
            }
        }

        // Generate tests with optional user API key
        const result = await testGenerator.generateTests({
            code,
            specs,
            framework,
            language,
            provider: providerToUse,
            userApiKey: apiKeyToUse,
        });

        // Save to history if requested
        let generation = null;
        if (saveHistory) {
            try {
                generation = await Generation.create({
                    sourceCode: code,
                    specs: specs || null,
                    generatedTests: result.generatedTests,
                    framework,
                    language,
                    generationTime: result.generationTime,
                    isValid: result.isValid,
                    userId: req.user?.id || null,
                    llmProvider: providerToUse,
                });
            } catch (dbError) {
                console.error('Failed to save to history:', dbError.message);
                // Continue without saving - don't fail the request
            }
        }

        res.json({
            success: true,
            data: {
                generatedTests: result.generatedTests,
                framework: result.framework,
                language: result.language,
                generationTime: result.generationTime,
                isValid: result.isValid,
                id: generation?.id || null,
                llmProvider: providerToUse,
            },
        });
    } catch (error) {
        console.error('Generation error:', error);
        next(error);
    }
});

/**
 * POST /api/generate/preview
 * Preview the prompt without calling LLM (for debugging)
 */
router.post('/preview', (req, res) => {
    const { code, specs, framework = 'pytest', language = 'python' } = req.body;

    if (!code) {
        return res.status(400).json({ error: 'Source code is required' });
    }

    // Dynamic import for ESM
    import('../utils/prompts.js').then(({ buildTestGenerationPrompt }) => {
        const prompt = buildTestGenerationPrompt({ code, specs, framework, language });
        res.json({
            prompt,
            estimatedTokens: Math.ceil(prompt.length / 4),
        });
    }).catch(err => {
        res.status(500).json({ error: 'Failed to build prompt' });
    });
});

export default router;

