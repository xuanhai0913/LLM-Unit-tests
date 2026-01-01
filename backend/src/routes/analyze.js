import express from 'express';
import { optionalAuth } from '../middleware/authMiddleware.js';
import config from '../config/index.js';
import { generateWithDashboardProxy } from '../services/dashboardProxy.js';

const router = express.Router();

/**
 * POST /api/analyze/file
 * Analyze a source file using LLM to detect coverage gaps
 */
router.post('/file', optionalAuth, async (req, res) => {
    const { sourceCode, fileName, language = 'javascript' } = req.body;

    if (!sourceCode) {
        return res.status(400).json({ error: 'Source code is required' });
    }

    try {
        const prompt = buildAnalysisPrompt(sourceCode, fileName, language);

        // Use dashboard proxy with default license key
        const licenseKey = req.user?.license_key || config.defaultLicenseKey;

        if (!licenseKey) {
            return res.status(400).json({ error: 'No license key available for analysis' });
        }

        const rawResponse = await generateWithDashboardProxy(licenseKey, prompt);

        // Parse LLM response
        const analysis = parseAnalysisResponse(rawResponse, sourceCode);

        res.json({
            success: true,
            data: analysis
        });
    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({ error: 'Failed to analyze file' });
    }
});

/**
 * Build prompt for code analysis
 */
function buildAnalysisPrompt(sourceCode, fileName, language) {
    return `You are a code analysis expert. Analyze this ${language} source file and identify testing gaps.

FILE: ${fileName}

SOURCE CODE:
\`\`\`${language}
${sourceCode}
\`\`\`

Respond ONLY in this exact JSON format (no markdown, no extra text):
{
    "functions": [
        {"name": "functionName", "lines": "10-20", "hasTests": false}
    ],
    "gaps": [
        {"name": "Error handling in functionName", "lines": "15-18", "priority": "HIGH", "reason": "No try-catch for async operation"}
    ],
    "estimatedCoverage": 35,
    "totalFunctions": 5,
    "testedFunctions": 2
}

Priority must be: HIGH, MEDIUM, or LOW
estimatedCoverage should be a number 0-100 based on how much of the code likely has tests.
Focus on: error handling, edge cases, async operations, input validation.`;
}

/**
 * Parse LLM analysis response
 */
function parseAnalysisResponse(response, sourceCode) {
    try {
        // Try to extract JSON from response
        let jsonStr = response;

        // Remove markdown code blocks if present
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1];
        }

        // Try to find JSON object
        const objMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (objMatch) {
            jsonStr = objMatch[0];
        }

        const parsed = JSON.parse(jsonStr);

        return {
            functions: parsed.functions || [],
            gaps: parsed.gaps || [],
            estimatedCoverage: parsed.estimatedCoverage || 30,
            totalFunctions: parsed.totalFunctions || 0,
            testedFunctions: parsed.testedFunctions || 0,
            linesOfCode: sourceCode.split('\n').length
        };
    } catch (e) {
        console.error('Failed to parse analysis response:', e);
        // Return basic analysis based on code structure
        const lines = sourceCode.split('\n');
        const functionMatches = sourceCode.match(/function\s+\w+|async\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(/g) || [];

        return {
            functions: [],
            gaps: [
                { name: 'General code coverage', lines: '1-' + lines.length, priority: 'MEDIUM', reason: 'Needs analysis' }
            ],
            estimatedCoverage: 25,
            totalFunctions: functionMatches.length,
            testedFunctions: 0,
            linesOfCode: lines.length
        };
    }
}

export default router;
