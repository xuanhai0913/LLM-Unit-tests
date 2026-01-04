import { extractCodeBlocks } from '../utils/prompts.js';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import CryptoJS from 'crypto-js';
import testGenerator from '../services/testGenerator.js';
import { generateWithDashboardProxy } from '../services/dashboardProxy.js';
import { User } from '../models/index.js';
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
 * Build improvement prompt for LLM with PROJECT CONTEXT
 */
function buildImprovementPrompt({ sourceCode, existingTests, language, framework, gaps, projectContext }) {
    const isJest = framework === 'jest';
    const jestInstructions = isJest ? `
- IMPORTANT: This project uses ES Modules ("type": "module").
- USE 'import' syntax, NOT 'require'.
- For mocking dependencies in ESM:
  1. Use 'jest.unstable_mockModule()' BEFORE importing the module under test.
  2. Use 'await import()' to import the module under test inside 'beforeEach' or after mocks.
  3. DO NOT use 'jest.mock()' with require inside tests.
- Example ESM Mocking:
  \`\`\`javascript
  import { jest } from '@jest/globals';
  jest.unstable_mockModule('../models/index.js', () => ({ User: { findOne: jest.fn() } }));
  const { User } = await import('../models/index.js');
  const authRouter = (await import('../src/routes/auth.js')).default;
  \`\`\`
- If mocking 'fetch', setup 'global.fetch = jest.fn();' in beforeEach.
- ensure all imports include the '.js' extension (e.g., import ... from './utils.js').` : '';

    // Build project context section if available
    let projectContextSection = '';
    if (projectContext && projectContext.length > 0) {
        projectContextSection = `
## PROJECT STRUCTURE (Related files for context):
${projectContext.map(file => `
### ${file.name} (${file.path}):
\`\`\`${language}
${file.content?.slice(0, 1500) || '// Content not available'}${file.content?.length > 1500 ? '\n// ... (truncated)' : ''}
\`\`\`
`).join('\n')}

Use this context to understand:
- How models/data structures are defined
- What middleware/utilities are available
- Import paths and naming conventions
`;
    }

    return `You are an expert test engineer improving an existing test suite.
${projectContextSection}
## SOURCE CODE TO TEST:
\`\`\`${language}
${sourceCode}
\`\`\`

## EXISTING TESTS (Already written - DO NOT duplicate):
\`\`\`${language}
${existingTests || '// No existing tests provided'}
\`\`\`

## COVERAGE GAPS TO FILL:
${gaps && gaps.length > 0 ? gaps.map((g, i) => `${i + 1}. ${g}`).join('\n') : '- Edge cases not covered\n- Error handling\n- Boundary conditions'}

## YOUR TASK:
Generate ADDITIONAL test cases to fill the coverage gaps.

## IMPORTANT RULES:
1. DO NOT duplicate any existing tests
2. Focus ONLY on the missing areas listed above
3. Follow the EXACT same style and patterns as the existing tests
4. Use the same test framework (${framework})${jestInstructions}
5. Include descriptive test names that explain what they test
6. Include edge cases and error scenarios
7. Add comments explaining what each new test covers
7. Add comments explaining what each new test covers
8. **CRITICAL: REUSE EXISTING STRUCTURE & IMPORT STRATEGY**:
   - Analyze the "EXISTING TESTS" section carefully.
   - **DO NOT use top-level await for imports.**
   - DECLARE variables at the top level (e.g., `let User, jwt, authRouter; `).
   - USE \`beforeAll(async () => { ... })\` inside the main \`describe\` block to load modules.
   - COPY the \`jest.unstable_mockModule\` calls exactly as they are (must be top-level).
   - See example:
     \`\`\`javascript
let User;
describe('Tests', () => {
    beforeAll(async () => {
        User = (await import('../path/to/model')).User;
    });
    // tests...
});
\`\`\`
   - Use the exact same variable names.
9. IF using 'fetch' in code, MOCK IT globally.

## OUTPUT FORMAT:
Return ONLY the new test code to ADD to the existing file.
Do NOT include any explanation, just the test code.
The code should be ready to append to the existing test file.

## GENERATE ADDITIONAL TESTS:`;
}

/**
 * Parse existing test file to extract test info
 */
function parseExistingTests(testCode, language) {
    let testCount = 0;
    let testNames = [];

    if (language === 'python') {
        // Match def test_xxx functions
        const matches = testCode.match(/def test_\w+/g) || [];
        testCount = matches.length;
        testNames = matches.map(m => m.replace('def ', ''));
    } else {
        // Match it('xxx', ... or test('xxx', ...
        const itMatches = testCode.match(/(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]/g) || [];
        testCount = itMatches.length;
        testNames = itMatches.map(m => {
            const match = m.match(/['"`]([^'"`]+)['"`]/);
            return match ? match[1] : '';
        });
    }

    return { testCount, testNames };
}

/**
 * Identify coverage gaps based on source code and existing tests
 */
function identifyGaps(sourceCode, existingTests, language) {
    const gaps = [];

    // Common patterns to check
    const patterns = {
        errorHandling: /throw|catch|error|exception/gi,
        asyncCode: /async|await|promise|then|catch/gi,
        conditionals: /if|else|switch|case/gi,
        loops: /for|while|forEach|map|filter|reduce/gi,
        nullChecks: /null|undefined|![\w]/gi,
        boundaryValues: /length|size|count|max|min|limit/gi,
    };

    // Check what's in source but might not be tested
    if (patterns.errorHandling.test(sourceCode)) {
        if (!/error|throw|exception|reject/i.test(existingTests)) {
            gaps.push('Error handling scenarios');
        }
    }

    if (patterns.asyncCode.test(sourceCode)) {
        if (!/timeout|async.*error|reject/i.test(existingTests)) {
            gaps.push('Async error handling and timeouts');
        }
    }

    if (patterns.nullChecks.test(sourceCode)) {
        if (!/null|undefined|empty/i.test(existingTests)) {
            gaps.push('Null/undefined input handling');
        }
    }

    if (patterns.boundaryValues.test(sourceCode)) {
        if (!/empty|zero|large|max|min|boundary/i.test(existingTests)) {
            gaps.push('Boundary values and edge cases');
        }
    }

    // Default gaps if none detected
    if (gaps.length === 0) {
        gaps.push('Additional edge cases');
        gaps.push('Error scenarios');
        gaps.push('Boundary conditions');
    }

    return gaps;
}

/**
 * POST /api/improve/analyze
 * Analyze source and test files to identify coverage gaps
 */
router.post('/analyze', optionalAuth, async (req, res, next) => {
    try {
        const { sourceCode, existingTests, language = 'javascript', framework = 'jest' } = req.body;

        if (!sourceCode || !existingTests) {
            return res.status(400).json({
                error: 'Both sourceCode and existingTests are required'
            });
        }

        // Parse existing tests
        const { testCount, testNames } = parseExistingTests(existingTests, language);

        // Identify gaps
        const gaps = identifyGaps(sourceCode, existingTests, language);

        // Estimate coverage (rough heuristic based on test count vs code lines)
        const sourceLines = sourceCode.split('\n').length;
        const estimatedCoverage = Math.min(Math.floor((testCount * 15) / sourceLines * 100), 60);

        res.json({
            success: true,
            data: {
                existingTestCount: testCount,
                existingTestNames: testNames,
                estimatedCoverage,
                gaps,
                language,
                framework
            }
        });
    } catch (error) {
        console.error('Analyze error:', error);
        next(error);
    }
});

/**
 * POST /api/improve/generate
 * Generate additional tests to fill coverage gaps
 */
router.post('/generate', optionalAuth, async (req, res, next) => {
    try {
        const {
            sourceCode,
            existingTests,
            language = 'javascript',
            framework = 'jest',
            gaps = [],
            llmProvider,
            projectContext = [] // NEW: Array of related files for context
        } = req.body;

        if (!sourceCode) {
            return res.status(400).json({
                error: 'Source code is required'
            });
        }

        // Build improvement prompt with project context
        const prompt = buildImprovementPrompt({
            sourceCode,
            existingTests,
            language,
            framework,
            gaps,
            projectContext // Pass project context to prompt builder
        });

        // Determine API key and provider
        let apiKeyToUse = null;
        let providerToUse = llmProvider || config.llm.provider;
        let useDashboard = false;
        let user = null;

        if (req.user) {
            user = await User.findByPk(req.user.id);
            if (user) {
                if (!llmProvider) {
                    providerToUse = user.preferred_llm || config.llm.provider;
                }

                if (providerToUse === 'gemini' && user.gemini_api_key) {
                    apiKeyToUse = decryptKey(user.gemini_api_key);
                } else if (providerToUse === 'deepseek' && user.deepseek_api_key) {
                    apiKeyToUse = decryptKey(user.deepseek_api_key);
                }

                if (!apiKeyToUse && user.license_key && user.license_status === 'active') {
                    useDashboard = true;
                }
            }
        }

        // Fallback: Use default license key if no user logged in and no API key
        let effectiveLicenseKey = user?.license_key;
        if (!apiKeyToUse && !effectiveLicenseKey && config.defaultLicenseKey) {
            effectiveLicenseKey = config.defaultLicenseKey;
            useDashboard = true;
            console.log('Using DEFAULT_LICENSE_KEY for public access (improve)');
        }

        const startTime = Date.now();
        let additionalTests = '';

        if (useDashboard && effectiveLicenseKey) {
            try {
                const rawResponse = await generateWithDashboardProxy(effectiveLicenseKey, prompt);
                const codeBlocks = extractCodeBlocks(rawResponse, language);
                additionalTests = codeBlocks.length > 0 ? codeBlocks[0] : rawResponse;
            } catch (proxyError) {
                console.error('Dashboard proxy failed:', proxyError.message);
                return res.status(503).json({
                    error: `Dashboard proxy error: ${proxyError.message}`,
                    suggestion: 'Thêm API key riêng trong Settings'
                });
            }
        } else {
            // Use testGenerator with custom prompt
            const result = await testGenerator.generateTests({
                code: sourceCode,
                specs: `EXISTING TESTS (DO NOT DUPLICATE):\n${existingTests}\n\nFILL THESE GAPS:\n${gaps.join(', ')}`,
                framework,
                language,
                provider: providerToUse,
                userApiKey: apiKeyToUse,
                customInstructions: 'Generate ONLY additional tests that are NOT already covered. Focus on edge cases and error handling.'
            });
            additionalTests = result.generatedTests;
        }

        const generationTime = Date.now() - startTime;

        // Count generated tests
        const { testCount: newTestCount } = parseExistingTests(additionalTests, language);

        res.json({
            success: true,
            data: {
                additionalTests,
                newTestCount,
                generationTime,
                llmProvider: providerToUse,
                framework,
                language
            }
        });
    } catch (error) {
        console.error('Generate improvement error:', error);
        next(error);
    }
});

export default router;
