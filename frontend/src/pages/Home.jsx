import { useState, useEffect } from 'react';
import { FiZap, FiCopy, FiDownload, FiCode, FiFileText, FiSettings, FiCpu } from 'react-icons/fi';
import toast from 'react-hot-toast';
import CodeEditor from '../components/CodeEditor';
import { generateTests } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const SAMPLE_CODE = `def calculate_average(numbers):
    """Calculate the average of a list of numbers."""
    if not numbers:
        raise ValueError("Cannot calculate average of empty list")
    return sum(numbers) / len(numbers)


def is_palindrome(text):
    """Check if a string is a palindrome."""
    cleaned = text.lower().replace(" ", "")
    return cleaned == cleaned[::-1]


class Calculator:
    """A simple calculator class."""
    
    def add(self, a, b):
        return a + b
    
    def subtract(self, a, b):
        return a - b
    
    def multiply(self, a, b):
        return a * b
    
    def divide(self, a, b):
        if b == 0:
            raise ZeroDivisionError("Cannot divide by zero")
        return a / b
`;

function Home() {
    const { user, isAuthenticated } = useAuth();
    const [code, setCode] = useState(SAMPLE_CODE);
    const [specs, setSpecs] = useState('');
    const [referenceCode, setReferenceCode] = useState('');
    const [framework, setFramework] = useState('pytest');
    const [language, setLanguage] = useState('python');
    const [llmProvider, setLlmProvider] = useState('gemini');
    const [generatedTests, setGeneratedTests] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [generationTime, setGenerationTime] = useState(null);
    const [showReference, setShowReference] = useState(false);

    // Set default provider from user preferences
    useEffect(() => {
        if (user?.preferred_llm) {
            setLlmProvider(user.preferred_llm);
        }
    }, [user]);

    const handleGenerate = async () => {
        if (!code.trim()) {
            toast.error('Please enter some code first');
            return;
        }

        setIsLoading(true);
        setGeneratedTests('');
        setGenerationTime(null);

        try {
            const result = await generateTests({
                code,
                specs: specs || undefined,
                framework,
                language,
                llmProvider,
                referenceCode: referenceCode || undefined,
                customInstructions: specs || undefined, // Map specs to customInstructions too if needed, or just let specs handle it.
                // Actually, let's keep specs as specs, and if I want specific instructions, I rely on proper prompting. 
                // The new prompt uses "specs" for Specs and "customInstructions" for User Defined Cases.
                // I will map the UI "specs" field to BOTH for now or just "customInstructions" if I want to enforce it.
                // Let's pass `specs` as `customInstructions` to ensure it falls into the "MUST FOLLOW" block which is stronger.
            });
            // Note: generateTests in api.js accepts customInstructions. I'll pass specs to it.

            if (result.success) {
                setGeneratedTests(result.data.generatedTests);
                setGenerationTime(result.data.generationTime);
                toast.success(`Tests generated with ${result.data.llmProvider || llmProvider}!`);
            } else {
                throw new Error(result.error || 'Generation failed');
            }
        } catch (error) {
            console.error('Generation error:', error);
            toast.error(error.response?.data?.error || error.message || 'Failed to generate tests');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        if (generatedTests) {
            navigator.clipboard.writeText(generatedTests);
            toast.success('Copied to clipboard!');
        }
    };

    const handleDownload = () => {
        if (generatedTests) {
            const filename = language === 'python' ? 'test_generated.py' : 'test_generated.js';
            const blob = new Blob([generatedTests], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Downloaded!');
        }
    };

    return (
        <div className="home-container fade-in">
            {/* Config Bar */}
            <div className="config-bar">
                <div className="config-left">
                    <div className="config-group">
                        <span className="config-label">Language</span>
                        <select
                            className="select"
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                        >
                            <option value="python">Python</option>
                            <option value="javascript">JavaScript</option>
                            <option value="typescript">TypeScript</option>
                        </select>
                    </div>
                    <div className="config-group">
                        <span className="config-label">Framework</span>
                        <select
                            className="select"
                            value={framework}
                            onChange={(e) => setFramework(e.target.value)}
                        >
                            <option value="pytest">pytest</option>
                            <option value="unittest">unittest</option>
                            <option value="jest">Jest</option>
                            <option value="mocha">Mocha</option>
                        </select>
                    </div>
                    <div className="config-group">
                        <span className="config-label"><FiCpu style={{ marginRight: '4px' }} />LLM</span>
                        <select
                            className="select"
                            value={llmProvider}
                            onChange={(e) => setLlmProvider(e.target.value)}
                        >
                            <option value="gemini">Gemini</option>
                            <option value="deepseek">Deepseek</option>
                        </select>
                    </div>
                </div>

                <button
                    className="btn btn-primary btn-generate"
                    onClick={handleGenerate}
                    disabled={isLoading || !code.trim()}
                >
                    {isLoading ? (
                        <>
                            <span className="loading-spinner"></span>
                            Generating...
                        </>
                    ) : (
                        <>
                            <FiZap />
                            Generate Unit Tests
                        </>
                    )}
                </button>
            </div>

            {/* Editors Grid */}
            <div className="editors-grid">
                {/* Source Code Panel */}
                <div className="panel">
                    <div className="panel-header">
                        <div className="panel-title">
                            <FiCode className="panel-title-icon" />
                            Source Code
                        </div>
                    </div>
                    <div className="panel-body">
                        <div className="editor-container">
                            <CodeEditor
                                value={code}
                                onChange={setCode}
                                language={language}
                            />
                        </div>
                    </div>
                </div>

                {/* Generated Tests Panel */}
                <div className="panel">
                    <div className="panel-header">
                        <div className="panel-title">
                            <FiFileText className="panel-title-icon" />
                            Generated Tests
                        </div>
                        {generatedTests && (
                            <div className="result-actions">
                                {generationTime && (
                                    <span className="result-stats">
                                        ⏱️ {(generationTime / 1000).toFixed(1)}s
                                    </span>
                                )}
                                <button className="btn btn-secondary btn-icon" onClick={handleCopy} title="Copy">
                                    <FiCopy />
                                </button>
                                <button className="btn btn-secondary btn-icon" onClick={handleDownload} title="Download">
                                    <FiDownload />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="panel-body">
                        {isLoading ? (
                            <div className="loading-overlay">
                                <div className="loading-pulse">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                                <p className="loading-text">AI is generating tests...</p>
                            </div>
                        ) : generatedTests ? (
                            <div className="editor-container">
                                <CodeEditor
                                    value={generatedTests}
                                    language={language}
                                    readOnly
                                />
                            </div>
                        ) : (
                            <div className="result-placeholder">
                                <FiCode className="result-placeholder-icon" />
                                <p className="result-placeholder-title">Ready to Generate</p>
                                <p className="result-placeholder-desc">
                                    Paste your code on the left, then click "Generate Unit Tests" to create comprehensive test cases
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Actions and Reference/Specs */}
            <div className="bottom-actions">
                <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>

                    {/* Manual Specs / Test Cases */}
                    <div className="specs-box" style={{ flex: 1 }}>
                        <label className="specs-label">
                            <FiSettings size={14} />
                            Requirements / Manual Test Cases
                        </label>
                        <textarea
                            className="specs-textarea"
                            placeholder="Example: Test divide by zero, Test empty string input..."
                            value={specs}
                            onChange={(e) => setSpecs(e.target.value)}
                        />
                    </div>

                    {/* Toggle Reference Code */}
                    <div className="specs-box" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <label className="specs-label">
                                <FiCopy size={14} />
                                Reference Test Code (Few-shot)
                            </label>
                            <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => setShowReference(!showReference)}
                                style={{ padding: '2px 8px', fontSize: '12px' }}
                            >
                                {showReference ? 'Hide' : 'Show'}
                            </button>
                        </div>

                        {showReference ? (
                            <div style={{ flex: 1, minHeight: '100px', border: '1px solid #334155', borderRadius: '4px', overflow: 'hidden' }}>
                                <CodeEditor
                                    value={referenceCode}
                                    onChange={setReferenceCode}
                                    language={language}
                                    height="100%"
                                />
                            </div>
                        ) : (
                            <div
                                className="specs-textarea"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer' }}
                                onClick={() => setShowReference(true)}
                            >
                                Click code to add Example/Reference Test Code...
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}

export default Home;
