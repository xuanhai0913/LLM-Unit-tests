import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

class SandboxService {
    constructor() {
        this.tempDir = path.join(os.tmpdir(), 'llm-sandbox');
        this._ensureTempDir();
    }

    async _ensureTempDir() {
        try {
            await fs.mkdir(this.tempDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create sandbox temp dir:', error);
        }
    }

    async executeTest(language, sourceCode, testCode) {
        const runId = uuidv4();
        const runDir = path.join(this.tempDir, runId);

        try {
            await fs.mkdir(runDir, { recursive: true });

            let command = '';
            let mainFile = '';

            if (language === 'python') {
                // Prepend source code to test code to ensure classes/functions are available
                const mergedCode = `${sourceCode}\n\n${testCode}`;
                await fs.writeFile(path.join(runDir, 'test_run.py'), mergedCode);

                // Run with pytest-cov and output json report
                command = `docker run --rm --network none --memory="128m" --cpus="0.5" -v "${runDir}:/app" -w /app llm-sandbox-python pytest --cov=. --cov-report=json:coverage.json test_run.py`;
            } else if (language === 'javascript' || language === 'typescript') {
                const ext = language === 'typescript' ? 'ts' : 'js';
                const sourceFile = `index.${ext}`;
                const testFile = `test_run.${ext}`;

                // Create tests/ subdirectory to match typical project structure
                // This allows ../src/models/index.js to resolve to /app/src/models/index.js
                const testsDir = path.join(runDir, 'tests');
                await fs.mkdir(testsDir, { recursive: true });

                // Always write source file to root (for simple imports)
                await fs.writeFile(path.join(runDir, sourceFile), sourceCode);

                let finalTestCode = testCode;
                // Check if test code imports source (simple check)
                const hasImport = testCode.includes('./index');
                // Check if test has its own mocks (self-contained test)
                const hasMocks = testCode.includes('jest.unstable_mockModule') || testCode.includes('jest.mock(');
                // Check if test uses beforeAll for imports (ESM pattern)
                const hasBeforeAllImports = testCode.includes('beforeAll(') && testCode.includes('await import(');

                if (!hasImport && !hasMocks && !hasBeforeAllImports) {
                    // Only merge if test has no mocks and no dynamic imports
                    finalTestCode = `${sourceCode}\n\n${testCode}`;
                }

                // Write test file to tests/ subdirectory
                await fs.writeFile(path.join(testsDir, testFile), finalTestCode);

                // Create stub files for mocked modules so Jest can resolve them
                // Paths are relative to tests/ directory, so ../src becomes /app/src
                const mockPathRegex = /jest\.(?:unstable_mockModule|mock)\s*\(\s*['"]([^'"]+)['"]/g;
                let match;
                const mockedPaths = new Set();
                while ((match = mockPathRegex.exec(testCode)) !== null) {
                    mockedPaths.add(match[1]);
                }

                // Create stub files for each mocked path
                for (const mockPath of mockedPaths) {
                    let stubPath;
                    let stubContent;

                    if (!mockPath.startsWith('.') && !mockPath.startsWith('/')) {
                        // It's an npm package - create stub in node_modules
                        const nodeModulesDir = path.join(runDir, 'node_modules', mockPath);
                        await fs.mkdir(nodeModulesDir, { recursive: true });
                        stubPath = path.join(nodeModulesDir, 'index.js');

                        // Create package.json for the stub module
                        await fs.writeFile(path.join(nodeModulesDir, 'package.json'), JSON.stringify({
                            name: mockPath,
                            main: 'index.js',
                            type: 'module'
                        }));

                        // Create comprehensive stub for common npm packages
                        stubContent = `// Auto-generated stub for ${mockPath}
const mockFn = () => {};
mockFn.mockReturnValue = () => mockFn;
mockFn.mockResolvedValue = () => mockFn;
export default { verify: mockFn, sign: mockFn, compare: mockFn, hash: mockFn, genSalt: mockFn };
export const verify = mockFn;
export const sign = mockFn;
export const compare = mockFn;
export const hash = mockFn;
export const genSalt = mockFn;
export const Strategy = class { constructor() {} };
export const use = mockFn;
export const authenticate = () => (req, res, next) => next();
export const serializeUser = mockFn;
export const deserializeUser = mockFn;
`;
                    } else {
                        // Relative path - resolve relative to tests/ directory
                        stubPath = path.resolve(testsDir, mockPath);
                        const stubDir = path.dirname(stubPath);
                        await fs.mkdir(stubDir, { recursive: true });

                        stubContent = `// Auto-generated stub for sandbox
export default {};
export const User = {};
export const History = {};
export const jwt = { secret: 'test', refreshSecret: 'test', accessExpirationMinutes: 15, refreshExpirationDays: 7 };
export const frontendUrl = 'http://localhost:3000';
export const google = { clientId: 'id', clientSecret: 'secret', callbackUrl: 'url' };
`;
                    }

                    await fs.writeFile(stubPath, stubContent);
                }

                // Create package.json with ESM support
                await fs.writeFile(path.join(runDir, 'package.json'), JSON.stringify({
                    type: 'module'
                }));

                // Create jest config with ESM support
                await fs.writeFile(path.join(runDir, 'jest.config.json'), JSON.stringify({
                    testEnvironment: 'node',
                    transform: {},
                    collectCoverage: true,
                    coverageDirectory: 'coverage',
                    coverageReporters: ['json-summary', 'text'],
                    testMatch: [`**/tests/${testFile}`],
                    rootDir: '.'
                }));

                // Run with jest coverage and ESM support (use global Jest path)
                command = `docker run --rm --network none --memory=256m -v "${runDir}:/app" -w /app llm-sandbox-node node --experimental-vm-modules /usr/local/lib/node_modules/jest/bin/jest.js --config jest.config.json`;
            } else {
                return { success: false, error: 'Unsupported language' };
            }

            // Execute
            const result = await this._runCommand(command);
            const details = this._parseOutput(language, result.stdout + result.stderr);

            // Parse Coverage
            try {
                if (language === 'python') {
                    const coveragePath = path.join(runDir, 'coverage.json');
                    const coverageData = JSON.parse(await fs.readFile(coveragePath, 'utf8'));
                    details.coverage = Math.round(coverageData.totals?.percent_covered || 0);
                } else if (language === 'javascript' || language === 'typescript') {
                    const coveragePath = path.join(runDir, 'coverage', 'coverage-summary.json');
                    const coverageData = JSON.parse(await fs.readFile(coveragePath, 'utf8'));
                    // Use line coverage as the main metric
                    details.coverage = Math.round(coverageData.total?.lines?.pct || 0);
                }
            } catch (err) {
                console.warn('Failed to parse coverage:', err.message);
                details.coverage = 0;
            }

            return {
                success: true,
                passed: result.exitCode === 0,
                output: result.stdout + (result.stderr ? '\nErrors:\n' + result.stderr : ''),
                exitCode: result.exitCode,
                details
            };

        } catch (error) {
            // Check for timeout or other runtime errors
            return {
                success: false,
                passed: false,
                output: error.message || 'Execution failed',
                error: error.message,
                details: { total: 0, passed: 0, failed: 1, error: error.message }
            };
        } finally {
            // Cleanup
            this._cleanup(runDir);
        }
    }

    _parseOutput(language, output) {
        const details = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: 0,
            coverage: 0,
            duration: '',
            tests: []
        };

        if (language === 'python') {
            // Pytest summary line can vary:
            // "======= 22 passed in 0.11s ======="
            // "======= 1 failed, 2 passed in 0.14s ======="

            // Extract total collected items first as a fallback
            const collectedMatch = output.match(/collected (\d+) items/);
            if (collectedMatch) {
                details.total = parseInt(collectedMatch[1]);
            }

            // More robust parsing by looking for individual keywords
            const passedMatch = output.match(/(\d+) passed/);
            const failedMatch = output.match(/(\d+) failed/);
            const errorMatch = output.match(/(\d+) error/);
            const timeMatch = output.match(/in ([\d.]+)s/);

            if (passedMatch) details.passed = parseInt(passedMatch[1]);
            if (failedMatch) details.failed = parseInt(failedMatch[1]);
            if (errorMatch) details.errors = parseInt(errorMatch[1]);
            if (timeMatch) details.duration = timeMatch[1] + 's';

            // Recalculate total if we have counts
            if (details.passed > 0 || details.failed > 0 || details.errors > 0) {
                details.total = Math.max(details.total, details.passed + details.failed + details.errors);
            }
        } else if (language === 'javascript' || language === 'typescript') {
            // Jest summary: "Tests:       1 failed, 2 passed, 3 total"
            const passedMatch = output.match(/(\d+) passed/);
            const failedMatch = output.match(/(\d+) failed/);
            const totalMatch = output.match(/(\d+) total/);
            const timeMatch = output.match(/Time:\s+([\d.]+) s/);

            if (passedMatch) details.passed = parseInt(passedMatch[1]);
            if (failedMatch) details.failed = parseInt(failedMatch[1]);
            if (totalMatch) details.total = parseInt(totalMatch[1]);
            if (timeMatch) details.duration = timeMatch[1] + 's';
        }

        return details;
    }

    _runCommand(command) {
        return new Promise((resolve, reject) => {
            exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
                // If error, it might be just exit code != 0 (test failed), which is "success" in terms of execution.
                // exec returns error if exit code is non-zero.
                if (error && error.killed) {
                    // Timeout
                    return resolve({ stdout: '', stderr: 'Execution timed out (10s limit)', exitCode: 124 });
                }

                resolve({
                    stdout: stdout || '',
                    stderr: stderr || '',
                    exitCode: error ? error.code : 0
                });
            });
        });
    }

    async _cleanup(runDir) {
        try {
            // Because files in runDir are created by Docker (root), 
            // the Node process (non-root) cannot delete them with fs.rm.
            // We spawn a small alpine container to remove the directory.
            const dirName = path.basename(runDir);
            const parentDir = path.dirname(runDir);

            // Mount parent dir and delete the specific child directory
            const command = `docker run --rm -v "${parentDir}:/workspace" alpine rm -rf /workspace/${dirName}`;

            await this._runCommand(command);
        } catch (error) {
            console.error(`Failed to cleanup ${runDir}:`, error.message);
        }
    }
}

export default new SandboxService();
