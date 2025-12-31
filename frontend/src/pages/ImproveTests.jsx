import { useState } from 'react';
import { FiZap, FiAlertCircle, FiFileText, FiCheckCircle, FiPlay, FiArrowLeft, FiUpload, FiCpu } from 'react-icons/fi';
import toast from 'react-hot-toast';
import CodeEditor from '../components/CodeEditor';
import { analyzeTests, generateImprovements, runTests } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import '../styles/improveMode.css';

// Sample source code for demo
const SAMPLE_SOURCE = `class SandboxService {
    constructor() {
        this.tempDir = '/tmp/sandbox';
        this.timeout = 10000; // 10 seconds
    }

    async executeTest(language, code, tests) {
        const runId = crypto.randomUUID();
        const workDir = path.join(this.tempDir, runId);
        
        try {
            await fs.mkdir(workDir, { recursive: true });
            
            if (language === 'python') {
                return await this._executePython(workDir, code, tests);
            } else if (language === 'javascript') {
                return await this._executeNode(workDir, code, tests);
            } else {
                throw new Error('Unsupported language: ' + language);
            }
        } finally {
            await this._cleanup(workDir);
        }
    }

    async _executePython(workDir, code, tests) {
        // Write files and run pytest
        const startTime = Date.now();
        const result = await this._runDocker('python-sandbox', workDir);
        return {
            success: result.exitCode === 0,
            output: result.stdout,
            error: result.stderr,
            duration: Date.now() - startTime
        };
    }

    async _cleanup(workDir) {
        try {
            await fs.rm(workDir, { recursive: true, force: true });
        } catch (err) {
            console.error('Cleanup failed:', err);
        }
    }
}`;

const SAMPLE_TESTS = `describe('SandboxService', () => {
    let sandbox;

    beforeEach(() => {
        sandbox = new SandboxService();
    });

    describe('executeTest', () => {
        it('should execute Python code successfully', async () => {
            const result = await sandbox.executeTest('python', 'print("hello")', 'def test_hello(): pass');
            expect(result.success).toBe(true);
        });

        it('should execute JavaScript code successfully', async () => {
            const result = await sandbox.executeTest('javascript', 'console.log("hi")', 'test("hi", () => {})');
            expect(result.success).toBe(true);
        });

        it('should return error for syntax errors', async () => {
            const result = await sandbox.executeTest('python', 'invalid syntax!!!', '');
            expect(result.success).toBe(false);
        });
    });
});`;

function ImproveTests() {
    const { user } = useAuth();

    // Input states
    const [sourceCode, setSourceCode] = useState(SAMPLE_SOURCE);
    const [existingTests, setExistingTests] = useState(SAMPLE_TESTS);
    const [language, setLanguage] = useState('javascript');
    const [framework, setFramework] = useState('jest');
    const [llmProvider, setLlmProvider] = useState('gemini');

    // Analysis states
    const [analysisResult, setAnalysisResult] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Generation states
    const [generatedTests, setGeneratedTests] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationTime, setGenerationTime] = useState(null);

    // Results states
    const [testResults, setTestResults] = useState(null);
    const [isRunning, setIsRunning] = useState(false);

    const handleAnalyze = async () => {
        if (!sourceCode.trim() || !existingTests.trim()) {
            toast.error('Please provide both source code and existing tests');
            return;
        }

        setIsAnalyzing(true);
        try {
            const result = await analyzeTests({
                sourceCode,
                existingTests,
                language,
                framework
            });

            if (result.success) {
                setAnalysisResult(result.data);
                toast.success(`Found ${result.data.existingTestCount} existing tests, ${result.data.gaps.length} gaps identified`);
            }
        } catch (error) {
            console.error('Analysis error:', error);
            toast.error(error.response?.data?.error || 'Analysis failed');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleGenerate = async () => {
        if (!analysisResult) {
            toast.error('Please analyze the code first');
            return;
        }

        setIsGenerating(true);
        setGeneratedTests('');

        try {
            const result = await generateImprovements({
                sourceCode,
                existingTests,
                language,
                framework,
                gaps: analysisResult.gaps,
                llmProvider
            });

            if (result.success) {
                setGeneratedTests(result.data.additionalTests);
                setGenerationTime(result.data.generationTime);
                toast.success(`Generated ${result.data.newTestCount || 'additional'} tests in ${(result.data.generationTime / 1000).toFixed(1)}s`);
            }
        } catch (error) {
            console.error('Generation error:', error);
            toast.error(error.response?.data?.error || 'Generation failed');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRunTests = async () => {
        if (!generatedTests) {
            toast.error('No generated tests to run');
            return;
        }

        setIsRunning(true);
        try {
            // Combine existing + new tests
            const allTests = existingTests + '\n\n// === ADDITIONAL GENERATED TESTS ===\n' + generatedTests;
            const result = await runTests({
                code: sourceCode,
                tests: allTests,
                language
            });
            setTestResults(result);
            if (result.passed) {
                toast.success('All tests passed!');
            } else {
                toast.error('Some tests failed');
            }
        } catch (error) {
            console.error('Run error:', error);
            toast.error('Failed to run tests');
        } finally {
            setIsRunning(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedTests);
        toast.success('Copied to clipboard!');
    };

    const handleMerge = () => {
        const merged = existingTests + '\n\n// === ADDITIONAL TESTS (Generated by LLM) ===\n' + generatedTests;
        setExistingTests(merged);
        setGeneratedTests('');
        setAnalysisResult(null);
        toast.success('Tests merged! Run analysis again to continue improving.');
    };

    return (
        <div className="improve-page">
            <div className="improve-header">
                <button onClick={() => window.location.href = '/'} className="back-link">
                    <FiArrowLeft /> Back to Generate
                </button>
                <h1>🔧 Improve Existing Tests</h1>
                <p>Paste your source code and existing tests to generate additional coverage</p>
            </div>

            {/* Config Bar */}
            <div className="improve-config">
                <div className="config-group">
                    <span className="config-label">Language</span>
                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className="select">
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                    </select>
                </div>
                <div className="config-group">
                    <span className="config-label">Framework</span>
                    <select value={framework} onChange={(e) => setFramework(e.target.value)} className="select">
                        <option value="pytest">pytest</option>
                        <option value="jest">Jest</option>
                        <option value="mocha">Mocha</option>
                    </select>
                </div>
                <div className="config-group">
                    <span className="config-label"><FiCpu /> LLM</span>
                    <select value={llmProvider} onChange={(e) => setLlmProvider(e.target.value)} className="select">
                        <option value="gemini">Gemini</option>
                        <option value="deepseek">Deepseek</option>
                    </select>
                </div>
                <button
                    className="btn btn-secondary"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                >
                    {isAnalyzing ? 'Analyzing...' : '🔍 Analyze'}
                </button>
            </div>

            {/* Code Editors Grid */}
            <div className="editors-grid">
                <div className="panel">
                    <div className="panel-header">
                        <div className="panel-title">
                            <FiFileText className="panel-title-icon" />
                            Source Code
                        </div>
                    </div>
                    <div className="panel-body">
                        <div className="editor-container">
                            <CodeEditor
                                value={sourceCode}
                                onChange={setSourceCode}
                                language={language}
                            />
                        </div>
                    </div>
                </div>

                <div className="panel">
                    <div className="panel-header">
                        <div className="panel-title">
                            <FiFileText className="panel-title-icon" />
                            Existing Tests
                        </div>
                    </div>
                    <div className="panel-body">
                        <div className="editor-container">
                            <CodeEditor
                                value={existingTests}
                                onChange={setExistingTests}
                                language={language}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Analysis Results */}
            {analysisResult && (
                <div className="analysis-card">
                    <h3>📊 Analysis Results</h3>
                    <div className="analysis-stats">
                        <div className="stat">
                            <span className="stat-value">{analysisResult.existingTestCount}</span>
                            <span className="stat-label">Existing Tests</span>
                        </div>
                        <div className="stat">
                            <span className="stat-value">{analysisResult.estimatedCoverage}%</span>
                            <span className="stat-label">Est. Coverage</span>
                        </div>
                        <div className="stat">
                            <span className="stat-value">{analysisResult.gaps.length}</span>
                            <span className="stat-label">Gaps Found</span>
                        </div>
                    </div>
                    <div className="gaps-section">
                        <span className="gaps-label">⚠️ Coverage Gaps:</span>
                        <ul className="gaps-list">
                            {analysisResult.gaps.map((gap, idx) => (
                                <li key={idx}>
                                    <FiAlertCircle size={12} />
                                    {gap}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <button
                        className="btn btn-primary btn-large"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                    >
                        {isGenerating ? (
                            <>
                                <span className="loading-spinner"></span>
                                Generating...
                            </>
                        ) : (
                            <>
                                <FiZap />
                                Generate Additional Tests
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Generated Tests */}
            {generatedTests && (
                <div className="results-section">
                    <div className="results-header">
                        <h2>✅ Generated Additional Tests</h2>
                        <div className="results-meta">
                            <span>Generated in {(generationTime / 1000).toFixed(1)}s</span>
                        </div>
                    </div>
                    <div className="code-preview">
                        <pre>{generatedTests}</pre>
                    </div>
                    <div className="results-actions">
                        <button className="btn btn-primary" onClick={handleRunTests} disabled={isRunning}>
                            <FiPlay /> {isRunning ? 'Running...' : 'Run All Tests'}
                        </button>
                        <button className="btn btn-secondary" onClick={handleCopy}>
                            📋 Copy
                        </button>
                        <button className="btn btn-secondary" onClick={handleMerge}>
                            💾 Merge with Existing
                        </button>
                    </div>
                </div>
            )}

            {/* Test Results */}
            {testResults && (
                <div className={`test-results ${testResults.passed ? 'passed' : 'failed'}`}>
                    <h3>{testResults.passed ? '✅ All Tests Passed!' : '❌ Some Tests Failed'}</h3>
                    <pre>{testResults.output}</pre>
                </div>
            )}
        </div>
    );
}

export default ImproveTests;
