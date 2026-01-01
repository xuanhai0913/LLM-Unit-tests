import { useState, useRef } from 'react';
import { FiFolder, FiGithub, FiFile, FiZap, FiArrowLeft, FiCheck, FiLoader, FiPlay, FiX, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { generateTests, runTests } from '../services/api';
import '../styles/scanProject.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function ScanProject() {
    // Input states
    const [githubUrl, setGithubUrl] = useState('');
    const [scannedFiles, setScannedFiles] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState(new Set());
    const [isScanning, setIsScanning] = useState(false);
    const [projectName, setProjectName] = useState('');

    // Generation states
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedResults, setGeneratedResults] = useState([]);
    const [currentFile, setCurrentFile] = useState('');
    const [progress, setProgress] = useState(0);

    // Settings
    const [language, setLanguage] = useState('python');
    const [framework, setFramework] = useState('pytest');
    const [llmProvider, setLlmProvider] = useState('gemini');

    const fileInputRef = useRef(null);

    // Scan GitHub repo
    const handleScanGithub = async () => {
        if (!githubUrl.trim()) {
            toast.error('Please enter a GitHub URL');
            return;
        }

        setIsScanning(true);
        try {
            const response = await fetch(`${API_URL}/scan/github`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: githubUrl })
            });

            const data = await response.json();

            if (data.success) {
                setScannedFiles(data.data.files);
                setSelectedFiles(new Set(data.data.files.map(f => f.path)));
                setProjectName(data.data.repoName);
                toast.success(`Found ${data.data.files.length} files`);
            } else {
                toast.error(data.error || 'Failed to scan repository');
            }
        } catch (error) {
            console.error('Scan error:', error);
            toast.error('Failed to scan repository');
        } finally {
            setIsScanning(false);
        }
    };

    // Handle folder upload
    const handleFolderUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setIsScanning(true);

        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });

        try {
            const response = await fetch(`${API_URL}/scan/files`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                setScannedFiles(data.data.files);
                setSelectedFiles(new Set(data.data.files.map(f => f.path)));
                setProjectName('Uploaded Project');
                toast.success(`Found ${data.data.totalFiles} source files (${data.data.totalLines} lines)`);
            } else {
                toast.error(data.error || 'Failed to scan files');
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Failed to upload files');
        } finally {
            setIsScanning(false);
        }
    };

    // Toggle file selection
    const toggleFile = (path) => {
        const newSelected = new Set(selectedFiles);
        if (newSelected.has(path)) {
            newSelected.delete(path);
        } else {
            newSelected.add(path);
        }
        setSelectedFiles(newSelected);
    };

    // Select/deselect all
    const toggleAll = () => {
        if (selectedFiles.size === scannedFiles.length) {
            setSelectedFiles(new Set());
        } else {
            setSelectedFiles(new Set(scannedFiles.map(f => f.path)));
        }
    };

    // Generate tests for selected files
    const handleGenerateAll = async () => {
        const filesToProcess = scannedFiles.filter(f => selectedFiles.has(f.path));

        if (filesToProcess.length === 0) {
            toast.error('Please select at least one file');
            return;
        }

        setIsGenerating(true);
        setGeneratedResults([]);
        setProgress(0);

        const results = [];

        for (let i = 0; i < filesToProcess.length; i++) {
            const file = filesToProcess[i];
            setCurrentFile(file.name);
            setProgress(Math.round((i / filesToProcess.length) * 100));

            try {
                // For GitHub files, fetch content first
                let content = file.content;
                if (!content && file.url) {
                    const contentRes = await fetch(`${API_URL}/scan/github/content`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: file.url })
                    });
                    const contentData = await contentRes.json();
                    content = contentData.success ? contentData.data.content : '';
                }

                if (!content) {
                    results.push({
                        file: file.name,
                        path: file.path,
                        error: 'Could not fetch file content'
                    });
                    continue;
                }

                // Determine framework based on language
                const fileLanguage = file.language || language;
                let fileFramework = framework;
                if (['javascript', 'typescript', 'jsx', 'tsx'].includes(fileLanguage)) {
                    fileFramework = 'jest';
                }

                // Generate tests
                const genResult = await generateTests({
                    code: content,
                    specs: '',
                    framework: fileFramework,
                    language: fileLanguage,
                    llmProvider
                });

                // API returns { success: true, data: { generatedTests: "..." } }
                const testsCode = genResult.data?.generatedTests || genResult.generatedTests || genResult.tests || '';

                results.push({
                    file: file.name,
                    path: file.path,
                    tests: testsCode,
                    success: !!testsCode
                });

            } catch (error) {
                console.error(`Error generating for ${file.name}:`, error);
                results.push({
                    file: file.name,
                    path: file.path,
                    error: error.message || 'Generation failed'
                });
            }
        }

        setGeneratedResults(results);
        setProgress(100);
        setCurrentFile('');
        setIsGenerating(false);

        const successCount = results.filter(r => r.success).length;
        toast.success(`Generated tests for ${successCount}/${filesToProcess.length} files`);
    };

    const totalLines = scannedFiles.reduce((sum, f) => sum + (f.lines || f.estimatedLines || 0), 0);

    return (
        <div className="scan-page">
            {/* Header */}
            <div className="scan-header">
                <button onClick={() => window.location.href = '/'} className="back-link">
                    <FiArrowLeft /> Back to Home
                </button>
                <h1> Scan Project</h1>
                <p>Upload a folder or paste GitHub URL to auto-generate tests for entire project</p>
            </div>

            {/* Input Section */}
            <div className="input-section">
                {/* GitHub URL */}
                <div className="input-card">
                    <div className="input-header">
                        <FiGithub className="input-icon" />
                        <span>GitHub URL</span>
                    </div>
                    <div className="github-input-row">
                        <input
                            type="text"
                            placeholder="https://github.com/username/repo"
                            value={githubUrl}
                            onChange={(e) => setGithubUrl(e.target.value)}
                            className="github-input"
                        />
                        <button
                            className="btn btn-primary"
                            onClick={handleScanGithub}
                            disabled={isScanning}
                        >
                            {isScanning ? 'Scanning...' : 'Scan'}
                        </button>
                    </div>
                </div>

                <div className="input-divider">
                    <span>OR</span>
                </div>

                {/* Folder Upload */}
                <div className="input-card">
                    <div className="input-header">
                        <FiFolder className="input-icon" />
                        <span>Upload Folder</span>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFolderUpload}
                        webkitdirectory=""
                        directory=""
                        multiple
                        style={{ display: 'none' }}
                    />
                    <button
                        className="upload-btn"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isScanning}
                    >
                        {isScanning ? (
                            <><FiLoader className="spinning" /> Scanning...</>
                        ) : (
                            <>📂 Choose Folder</>
                        )}
                    </button>
                </div>
            </div>

            {/* Scanned Files */}
            {scannedFiles.length > 0 && (
                <div className="files-section">
                    <div className="files-header">
                        <div>
                            <h2> {projectName || 'Scanned Project'}</h2>
                            <p>{scannedFiles.length} files • {totalLines} lines</p>
                        </div>
                        <div className="config-selects">
                            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                                <option value="python">Python</option>
                                <option value="javascript">JavaScript</option>
                            </select>
                            <select value={framework} onChange={(e) => setFramework(e.target.value)}>
                                <option value="pytest">pytest</option>
                                <option value="jest">Jest</option>
                                <option value="mocha">Mocha</option>
                            </select>
                            <select value={llmProvider} onChange={(e) => setLlmProvider(e.target.value)}>
                                <option value="gemini">Gemini</option>
                                <option value="deepseek">Deepseek</option>
                            </select>
                        </div>
                    </div>

                    <div className="files-list">
                        <div className="files-list-header">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={selectedFiles.size === scannedFiles.length}
                                    onChange={toggleAll}
                                />
                                <span>Select All</span>
                            </label>
                            <span>{selectedFiles.size} selected</span>
                        </div>

                        {scannedFiles.map((file) => (
                            <div
                                key={file.path}
                                className={`file-item ${selectedFiles.has(file.path) ? 'selected' : ''}`}
                            >
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={selectedFiles.has(file.path)}
                                        onChange={() => toggleFile(file.path)}
                                    />
                                    <FiFile className="file-icon" />
                                    <span className="file-name">{file.name}</span>
                                </label>
                                <span className="file-path">{file.path}</span>
                                <span className="file-lines">{file.lines || file.estimatedLines || '?'} lines</span>
                            </div>
                        ))}
                    </div>

                    <button
                        className="btn btn-primary btn-large generate-all-btn"
                        onClick={handleGenerateAll}
                        disabled={isGenerating || selectedFiles.size === 0}
                    >
                        {isGenerating ? (
                            <>
                                <FiLoader className="spinning" />
                                Generating ({progress}%) - {currentFile}
                            </>
                        ) : (
                            <>
                                <FiZap />
                                Generate Tests for {selectedFiles.size} Files
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Results */}
            {generatedResults.length > 0 && (
                <div className="results-section">
                    <h2>Generated Tests</h2>
                    <div className="results-grid">
                        {generatedResults.map((result, idx) => (
                            <div key={idx} className={`result-card ${result.success ? 'success' : 'error'} ${result.testResult ? (result.testResult.passed ? 'test-passed' : 'test-failed') : ''}`}>
                                <div className="result-header">
                                    {result.success ? <FiCheck /> : <FiAlertCircle />}
                                    <span>{result.file}</span>
                                    {result.success && result.tests && (
                                        <span className="line-count">
                                            {result.tests.split('\n').length} lines
                                        </span>
                                    )}
                                </div>

                                {/* Test Results Display */}
                                {result.testResult && (
                                    <div className={`test-result-section ${result.testResult.passed ? 'passed' : 'failed'}`}>
                                        <div className={`test-result-banner ${result.testResult.passed ? 'passed' : 'failed'}`}>
                                            {result.testResult.error ? (
                                                <>Error: {result.testResult.error}</>
                                            ) : result.testResult.passed ? (
                                                <>Tests PASSED</>
                                            ) : (
                                                <>Tests FAILED</>
                                            )}
                                        </div>
                                        {/* Show test output log */}
                                        {result.testResult.output && (
                                            <div className="test-output-log">
                                                <div className="test-output-header">Test Output:</div>
                                                <pre className="test-output-content">{result.testResult.output}</pre>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {result.success ? (
                                    <div className="result-preview">
                                        <pre>{result.tests}</pre>
                                        <div className="result-actions">
                                            <button
                                                className="btn btn-primary"
                                                disabled={result.isRunning}
                                                onClick={async () => {
                                                    // Find the file content for this result
                                                    const file = scannedFiles.find(f => f.name === result.file);
                                                    let sourceCode = file?.content || '';

                                                    // If no content, try to fetch from GitHub
                                                    if (!sourceCode && file?.url) {
                                                        try {
                                                            const res = await fetch(`${API_URL}/scan/github/content`, {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ url: file.url })
                                                            });
                                                            const data = await res.json();
                                                            sourceCode = data.success ? data.data.content : '';
                                                        } catch (e) {
                                                            console.error('Failed to fetch source:', e);
                                                        }
                                                    }

                                                    // Update result to show running
                                                    setGeneratedResults(prev => prev.map((r, i) =>
                                                        i === idx ? { ...r, isRunning: true } : r
                                                    ));

                                                    try {
                                                        const testResult = await runTests({
                                                            code: sourceCode,
                                                            tests: result.tests,
                                                            language: file?.language || language
                                                        });

                                                        // Update with results
                                                        setGeneratedResults(prev => prev.map((r, i) =>
                                                            i === idx ? {
                                                                ...r,
                                                                isRunning: false,
                                                                testResult: {
                                                                    passed: testResult.data?.passed || testResult.passed,
                                                                    passedCount: testResult.data?.passedTests || 0,
                                                                    totalTests: testResult.data?.totalTests || 0,
                                                                    output: testResult.data?.output || testResult.output
                                                                }
                                                            } : r
                                                        ));

                                                        if (testResult.data?.passed || testResult.passed) {
                                                            toast.success('Tests passed!');
                                                        } else {
                                                            toast.error('Some tests failed');
                                                        }
                                                    } catch (error) {
                                                        console.error('Run tests error:', error);
                                                        setGeneratedResults(prev => prev.map((r, i) =>
                                                            i === idx ? { ...r, isRunning: false, testResult: { passed: false, error: error.message } } : r
                                                        ));
                                                        toast.error('Failed to run tests');
                                                    }
                                                }}
                                            >
                                                {result.isRunning ? (
                                                    <><FiLoader className="spinning" /> Running...</>
                                                ) : (
                                                    <><FiPlay /> Run Tests</>
                                                )}
                                            </button>
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(result.tests);
                                                    toast.success('Copied full code!');
                                                }}
                                            >
                                                Copy All
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="error-msg">{result.error}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default ScanProject;
