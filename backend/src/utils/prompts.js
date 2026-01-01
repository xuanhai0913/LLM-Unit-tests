/**
 * Prompt engineering utilities for test generation.
 */

const DEFAULT_SYSTEM_INSTRUCTIONS = `You are an expert software engineer and test writer.
Generate high-quality, minimal, and maintainable unit tests.
Cover normal cases, edge cases, and error handling.
Follow best practices for the specified testing framework.`;

/**
 * Build prompt for generating unit tests
 * @param {object} params - Parameters
 * @param {string} params.code - Source code to test
 * @param {string} [params.specs] - Optional specifications
 * @param {string} [params.framework] - Test framework (pytest, unittest, jest, etc.)
 * @param {string} [params.language] - Programming language
 * @param {string} [params.referenceCode] - Optional reference code for few-shot prompting
 * @param {string} [params.customInstructions] - Optional custom instructions for test generation
 * @returns {string} Complete prompt
 */
export function buildTestGenerationPrompt({ code, specs = '', framework = 'pytest', language = 'python', referenceCode = '', customInstructions = '' }) {
    const frameworkGuide = getFrameworkGuide(framework);

    let prompt = `System: ${DEFAULT_SYSTEM_INSTRUCTIONS}

${frameworkGuide}

`;

    if (specs) {
        prompt += `Specifications/Requirements:
${specs}

`;
    }

    prompt += `Code under test:
\`\`\`${language}
${code}
\`\`\`

`;

    if (referenceCode) {
        prompt += `Reference/Example Test Code (Follow this style):
\`\`\`${language}
${referenceCode}
\`\`\`

`;
    }

    if (customInstructions) {
        prompt += `User Defined Test Cases / Instructions (MUST FOLLOW):
${customInstructions}

`;
    }

    prompt += `Instructions:
1. Analyze the code carefully
2. Identify all functions, classes, and their behaviors
3. Generate comprehensive unit tests covering:
   - Normal/happy path cases
   - Edge cases (empty inputs, boundary values, etc.)
   - Error handling and exceptions
4. Use meaningful test names that describe the scenario
5. Include comments explaining complex test cases
${referenceCode ? '6. Strictly follow the coding style, naming convention, and libraries used in the Reference Code above.' : '6. Follow best practices for the specified testing framework.'}
${customInstructions ? '7. Ensure all User Defined Test Cases are implemented.' : ''}

Output ONLY the test code. Do not include explanations outside the code.
If using Markdown, wrap code in a single \`\`\`${language} block.
`;

    return prompt;
}

/**
 * Get framework-specific instructions
 */
function getFrameworkGuide(framework) {
    const guides = {
        pytest: `Use pytest framework. Include fixtures if helpful. Use assert statements.
Import pytest at the top. Use @pytest.fixture for reusable test data.`,

        unittest: `Use Python's unittest framework. Create test classes extending unittest.TestCase.
Use self.assertEqual, self.assertTrue, etc. for assertions.`,

        jest: `Use Jest testing framework. Use describe() and it() for test organization.
Use expect() for assertions. Mock dependencies with jest.mock() if needed.
IMPORTANT: The code under test is stored in a file named "./index.js". You MUST import the functions/classes to test from "./index", e.g., "const myModule = require('./index');" or "import myModule from './index';".
IMPORTANT: External libraries (like ioredis, axios, etc.) are NOT installed. You MUST mock them using explicit factory AND { virtual: true }.
Example: jest.mock('ioredis', () => jest.fn().mockImplementation(() => ({ get: jest.fn(), set: jest.fn() })), { virtual: true });`,

        mocha: `Use Mocha with Chai for assertions. Use describe() and it() for structure.
Use expect() or should syntax for assertions.`,
    };

    return guides[framework.toLowerCase()] || guides.pytest;
}

/**
 * Extract code blocks from markdown text
 * @param {string} text - Text containing code blocks
 * @param {string} language - Language to extract
 * @returns {string[]} Array of code blocks
 */
export function extractCodeBlocks(text, language = 'python') {
    const blocks = [];
    const lines = text.split('\n');
    let inBlock = false;
    let currentBlock = [];

    for (const line of lines) {
        if (line.startsWith(`\`\`\`${language}`) || line.startsWith('```python') || line.startsWith('```')) {
            if (!inBlock) {
                inBlock = true;
                currentBlock = [];
            } else {
                inBlock = false;
                if (currentBlock.length > 0) {
                    blocks.push(currentBlock.join('\n'));
                }
            }
        } else if (inBlock) {
            currentBlock.push(line);
        }
    }

    return blocks;
}

export default { buildTestGenerationPrompt, extractCodeBlocks };
