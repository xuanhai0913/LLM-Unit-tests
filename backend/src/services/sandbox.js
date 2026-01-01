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
                // Prepend source code to test code for JS as well
                const mergedCode = `${sourceCode}\n\n${testCode}`;
                await fs.writeFile(path.join(runDir, 'test_run.js'), mergedCode);

                // Create jest config
                await fs.writeFile(path.join(runDir, 'jest.config.json'), JSON.stringify({
                    testEnvironment: 'node',
                    collectCoverage: true,
                    coverageDirectory: 'coverage',
                    coverageReporters: ['json-summary', 'text']
                }));

                // Run with jest coverage
                command = `docker run --rm --network none --memory="128m" --cpus="0.5" -v "${runDir}:/app" -w /app llm-sandbox-node jest --config jest.config.json test_run.js`;
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
