import { useState } from 'react';
import { FiZap, FiCopy, FiDownload, FiCode, FiFileText, FiSettings } from 'react-icons/fi';
import toast from 'react-hot-toast';
import CodeEditor from '../components/CodeEditor';
import { generateTests } from '../services/api';

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
    const [code, setCode] = useState(SAMPLE_CODE);
    const [specs, setSpecs] = useState('');
    const [framework, setFramework] = useState('pytest');
    const [language, setLanguage] = useState('python');
    const [generatedTests, setGeneratedTests] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [generationTime, setGenerationTime] = useState(null);

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
            });

            if (result.success) {
                setGeneratedTests(result.data.generatedTests);
                setGenerationTime(result.data.generationTime);
                toast.success('Tests generated successfully!');
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

            {/* Bottom Specs Section */}
            <div className="bottom-actions">
                <div className="specs-box">
                    <label className="specs-label">
                        <FiSettings size={14} />
                        Specifications (Optional)
                    </label>
                    <textarea
                        className="specs-textarea"
                        placeholder="Add requirements, edge cases, or specific behaviors to test..."
                        value={specs}
                        onChange={(e) => setSpecs(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}

export default Home;
