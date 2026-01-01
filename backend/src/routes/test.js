import express from 'express';
import sandboxService from '../services/sandbox.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * POST /api/test/run
 * Execute unit tests in a sandboxed environment
 */
router.post('/run', optionalAuth, async (req, res) => {
    try {
        const { language, code, tests } = req.body;

        if (!language || !code || !tests) {
            return res.status(400).json({ error: 'Missing required fields: language, code, tests' });
        }

        if (!['python', 'javascript', 'typescript'].includes(language)) {
            return res.status(400).json({ error: 'Unsupported language' });
        }

        // Execute test
        const result = await sandboxService.executeTest(language, code, tests);

        res.json(result);
    } catch (error) {
        console.error('Test execution error:', error);
        res.status(500).json({ error: 'Internal server error during test execution' });
    }
});

export default router;
