import { useState } from 'react';
import { FiZap, FiActivity, FiCheckCircle, FiAlertCircle, FiCode, FiFileText } from 'react-icons/fi';
import '../styles/improveMode.css';

// Mock coverage data for demo
const MOCK_COVERAGE_DATA = [
    {
        name: 'sandbox.js',
        existingTests: 3,
        coverage: 45,
        gaps: ['Timeout handling', 'Cleanup errors', 'Coverage extraction']
    },
    {
        name: 'auth.js',
        existingTests: 3,
        coverage: 35,
        gaps: ['JWT validation', 'OAuth callback', 'Password validation']
    },
    {
        name: 'testGenerator.js',
        existingTests: 4,
        coverage: 40,
        gaps: ['Error handling', 'Retry logic', 'Different frameworks']
    }
];

function ImproveModeDemo() {
    const [selectedModule, setSelectedModule] = useState(null);

    return (
        <div className="improve-mode-container">
            <div className="improve-header">
                <h2>📊 Project Analysis - Backend LLM-Unit-Tests</h2>
                <p>Analyzed 15 files, found 3 test files with ~40% average coverage</p>
            </div>

            <div className="modules-grid">
                {MOCK_COVERAGE_DATA.map((module) => (
                    <div
                        key={module.name}
                        className={`module-card ${selectedModule?.name === module.name ? 'selected' : ''}`}
                        onClick={() => setSelectedModule(module)}
                    >
                        <div className="module-header">
                            <FiFileText className="module-icon" />
                            <h3>{module.name}</h3>
                        </div>

                        <div className="module-stats">
                            <div className="stat">
                                <span className="stat-label">Existing Tests</span>
                                <span className="stat-value">{module.existingTests}</span>
                            </div>
                            <div className="stat">
                                <span className="stat-label">Coverage</span>
                                <span className={`stat-value coverage-${module.coverage < 50 ? 'low' : 'medium'}`}>
                                    {module.coverage}%
                                </span>
                            </div>
                        </div>

                        <div className="coverage-bar">
                            <div
                                className="coverage-fill"
                                style={{ width: `${module.coverage}%` }}
                            />
                        </div>

                        <div className="gaps-section">
                            <span className="gaps-label">Missing Coverage:</span>
                            <ul className="gaps-list">
                                {module.gaps.map((gap, idx) => (
                                    <li key={idx}>
                                        <FiAlertCircle size={12} />
                                        {gap}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>

            {selectedModule && (
                <div className="improve-action">
                    <button className="btn btn-primary btn-large">
                        <FiZap />
                        Generate Additional Tests for {selectedModule.name}
                    </button>
                    <p className="improvement-hint">
                        AI will analyze existing tests and generate {Math.floor(3 * (100 - selectedModule.coverage) / 10)} additional test cases
                        to improve coverage from {selectedModule.coverage}% to ~85%
                    </p>
                </div>
            )}
        </div>
    );
}

export default ImproveModeDemo;
