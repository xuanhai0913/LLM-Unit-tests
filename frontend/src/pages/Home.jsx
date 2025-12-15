import { useState } from 'react';
import { FiPlay, FiCopy, FiDownload, FiCode, FiFileText, FiZap } from 'react-icons/fi';
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
            {/* Input Panel */}
            <div className="card editor-panel">
                <div className="card-header">
                    <h2 className="card-title">
                        <FiCode />
                        Source Code
                    </h2>
                    <div className="toolbar">
                        <div className="toolbar-group">
                            <select
                                className="select"
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                            >
                                <option value="python">Python</option>
                                <option value="javascript">JavaScript</option>
                                <option value="typescript">TypeScript</option>
                            </select>
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
                </div>

                <div className="editor-container">
                    <CodeEditor
                        value={code}
                        onChange={setCode}
                        language={language}
                    />
                </div>

                {/* Specs Section */}
                <div style={{ marginTop: 'var(--spacing-md)' }}>
                    <label className="card-title" style={{ marginBottom: 'var(--spacing-sm)', fontSize: '0.9rem' }}>
                        <FiFileText />
                        Specifications (Optional)
                    </label>
                    <textarea
                        className="textarea"
                        placeholder="Add any requirements, edge cases, or specific behaviors you want to test..."
                        value={specs}
                        onChange={(e) => setSpecs(e.target.value)}
                        rows={3}
                    />
                </div>

                <div style={{ marginTop: 'var(--spacing-md)' }}>
                    <button
                        className="btn btn-primary"
                        onClick={handleGenerate}
                        disabled={isLoading || !code.trim()}
                        style={{ width: '100%', padding: 'var(--spacing-md)' }}
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
            </div>

            {/* Output Panel */}
            <div className="card result-panel">
                <div className="card-header">
                    <h2 className="card-title">
                        <FiFileText />
                        Generated Tests
                        {generationTime && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                ({(generationTime / 1000).toFixed(1)}s)
                            </span>
                        )}
                    </h2>
                    {generatedTests && (
                        <div className="result-actions">
                            <button className="btn btn-secondary btn-icon" onClick={handleCopy} title="Copy">
                                <FiCopy />
                            </button>
                            <button className="btn btn-secondary btn-icon" onClick={handleDownload} title="Download">
                                <FiDownload />
                            </button>
                        </div>
                    )}
                </div>

                <div className="result-content" style={{ position: 'relative' }}>
                    {isLoading && (
                        <div className="loading-overlay">
                            <span className="loading-spinner" style={{ width: 40, height: 40 }}></span>
                            <p>AI is generating tests...</p>
                        </div>
                    )}

                    {generatedTests ? (
                        <CodeEditor
                            value={generatedTests}
                            language={language}
                            readOnly
                        />
                    ) : (
                        <div className="result-placeholder">
                            <FiCode className="result-placeholder-icon" />
                            <p>Generated tests will appear here</p>
                            <p style={{ fontSize: '0.85rem' }}>Enter your code and click "Generate"</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Home;
