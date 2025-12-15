import express from 'express';
import testGenerator from '../services/testGenerator.js';
import { Generation } from '../models/index.js';

const router = express.Router();

/**
 * POST /api/generate
 * Generate unit tests from source code
 * 
 * @body {string} code - Source code to test (required)
 * @body {string} [specs] - Optional specifications/requirements
 * @body {string} [framework] - Test framework (default: pytest)
 * @body {string} [language] - Programming language (default: python)
 * @body {boolean} [saveHistory] - Save to history (default: true)
 */
router.post('/', async (req, res, next) => {
    try {
        const { code, specs, framework = 'pytest', language = 'python', saveHistory = true } = req.body;

        // Validate input
        if (!code || typeof code !== 'string' || code.trim().length === 0) {
            return res.status(400).json({
                error: 'Source code is required',
                field: 'code',
            });
        }

        // Generate tests
        const result = await testGenerator.generateTests({
            code,
            specs,
            framework,
            language,
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

    const { buildTestGenerationPrompt } = require('../utils/prompts.js');
    const prompt = buildTestGenerationPrompt({ code, specs, framework, language });

    res.json({
        prompt,
        estimatedTokens: Math.ceil(prompt.length / 4), // Rough estimate
    });
});

export default router;
