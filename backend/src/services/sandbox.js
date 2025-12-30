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

                command = `docker run --rm --network none --memory="128m" --cpus="0.5" -v "${runDir}:/app" -w /app llm-sandbox-python pytest test_run.py`;
            } else if (language === 'javascript' || language === 'typescript') {
                // Prepend source code to test code for JS as well
                const mergedCode = `${sourceCode}\n\n${testCode}`;
                await fs.writeFile(path.join(runDir, 'test_run.js'), mergedCode);

                command = `docker run --rm --network none --memory="128m" --cpus="0.5" -v "${runDir}:/app" -w /app llm-sandbox-node jest test_run.js`;
            } else {
                return { success: false, error: 'Unsupported language' };
            }

            // Execute
            const result = await this._runCommand(command);
            const details = this._parseOutput(language, result.stdout + result.stderr);

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
            duration: '',
            tests: []
        };

        if (language === 'python') {
            // Pytest summary: "======= 1 failed, 2 passed in 0.14s ======="
            const summaryRegex = /==+ (?:(\d+) failed, )?(?:(\d+) passed, )?(?:(\d+) errors?, )?(?:(\d+) warnings? )?in ([\d.]+)s ==+/;
            const match = output.match(summaryRegex);

            if (match) {
                details.failed = parseInt(match[1] || 0);
                details.passed = parseInt(match[2] || 0);
                details.errors = parseInt(match[3] || 0);
                details.total = details.passed + details.failed + details.errors;
                details.duration = match[5] + 's';
            }

            // Simple parsing for collected items
            const collectedMatch = output.match(/collected (\d+) items/);
            if (collectedMatch && details.total === 0) {
                details.total = parseInt(collectedMatch[1]);
            }
        } else if (language === 'javascript' || language === 'typescript') {
            // Jest summary: "Tests:       1 failed, 2 passed, 3 total"
            const summaryRegex = /Tests:\s+(?:(\d+) failed,\s+)?(?:(\d+) passed,\s+)?(\d+) total/;
            const match = output.match(summaryRegex);

            if (match) {
                details.failed = parseInt(match[1] || 0);
                details.passed = parseInt(match[2] || 0);
                details.total = parseInt(match[3] || 0);
            }

            const timeMatch = output.match(/Time:\s+([\d.]+) s/);
            if (timeMatch) {
                details.duration = timeMatch[1] + 's';
            }
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

    async _cleanup(dir) {
        try {
            await fs.rm(dir, { recursive: true, force: true });
        } catch (e) {
            console.error(`Failed to cleanup ${dir}:`, e);
        }
    }
}

export default new SandboxService();
