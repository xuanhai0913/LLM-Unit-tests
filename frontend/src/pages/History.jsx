import { useState, useEffect } from 'react';
import { FiTrash2, FiClock, FiCode, FiEye, FiX, FiCopy, FiDownload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getHistory, getGeneration, deleteGeneration } from '../services/api';
import CodeEditor from '../components/CodeEditor';

function History() {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const result = await getHistory();
            if (result.success) {
                setHistory(result.data);
            }
        } catch (error) {
            console.error('Failed to load history:', error);
            toast.error('Failed to load history');
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewItem = async (id) => {
        try {
            const result = await getGeneration(id);
            if (result.success) {
                setSelectedItem(result.data);
            }
        } catch (error) {
            toast.error('Failed to load details');
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!confirm('Delete this generation?')) return;

        try {
            await deleteGeneration(id);
            setHistory(prev => prev.filter(item => item.id !== id));
            if (selectedItem?.id === id) {
                setSelectedItem(null);
            }
            toast.success('Deleted');
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const handleCopy = () => {
        if (selectedItem) {
            navigator.clipboard.writeText(selectedItem.generatedTests);
            toast.success('Copied!');
        }
    };

    const handleDownload = () => {
        if (selectedItem) {
            const filename = selectedItem.language === 'python' ? 'test_generated.py' : 'test_generated.js';
            const blob = new Blob([selectedItem.generatedTests], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('vi-VN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (isLoading) {
        return (
            <div className="history-container fade-in">
                <div className="panel" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                    <div className="loading-pulse" style={{ justifyContent: 'center' }}>
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <p className="loading-text" style={{ marginTop: 'var(--space-4)' }}>Loading history...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="history-container fade-in">
            <div className="history-header">
                <h1 className="history-title">
                    <FiClock />
                    Generation History
                    <span className="history-count">({history.length} items)</span>
                </h1>
            </div>

            {history.length === 0 ? (
                <div className="panel">
                    <div className="empty-state">
                        <FiCode className="empty-state-icon" />
                        <h3 className="empty-state-title">No generations yet</h3>
                        <p>Your test generations will appear here</p>
                    </div>
                </div>
            ) : (
                <div className="history-list">
                    {history.map((item) => (
                        <div
                            key={item.id}
                            className="history-item slide-in"
                            onClick={() => handleViewItem(item.id)}
                        >
                            <div className="history-item-info">
                                <div className="history-item-meta">
                                    <span className="badge badge-purple">{item.framework}</span>
                                    <span className="badge badge-cyan">{item.language}</span>
                                    <span>
                                        <FiClock size={12} style={{ marginRight: 4 }} />
                                        {formatDate(item.createdAt)}
                                    </span>
                                    {item.generationTime && (
                                        <span>⏱️ {(item.generationTime / 1000).toFixed(1)}s</span>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                <button className="btn btn-secondary btn-icon" title="View">
                                    <FiEye />
                                </button>
                                <button
                                    className="btn btn-secondary btn-icon"
                                    onClick={(e) => handleDelete(item.id, e)}
                                    title="Delete"
                                >
                                    <FiTrash2 />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Detail Modal */}
            {selectedItem && (
                <div
                    className="modal-backdrop"
                    onClick={() => setSelectedItem(null)}
                >
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="panel-header">
                            <div className="panel-title">
                                <FiCode className="panel-title-icon" />
                                Generation Details
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                <span className="badge badge-purple">{selectedItem.framework}</span>
                                <span className="badge badge-cyan">{selectedItem.language}</span>
                                <button className="btn btn-secondary btn-icon" onClick={handleCopy} title="Copy">
                                    <FiCopy />
                                </button>
                                <button className="btn btn-secondary btn-icon" onClick={handleDownload} title="Download">
                                    <FiDownload />
                                </button>
                                <button
                                    className="btn btn-secondary btn-icon"
                                    onClick={() => setSelectedItem(null)}
                                    title="Close"
                                >
                                    <FiX />
                                </button>
                            </div>
                        </div>

                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--border-subtle)', minHeight: 400 }}>
                            <div style={{ background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                    Source Code
                                </div>
                                <div className="editor-container" style={{ flex: 1 }}>
                                    <CodeEditor value={selectedItem.sourceCode} language={selectedItem.language} readOnly />
                                </div>
                            </div>
                            <div style={{ background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                    Generated Tests
                                </div>
                                <div className="editor-container" style={{ flex: 1 }}>
                                    <CodeEditor value={selectedItem.generatedTests} language={selectedItem.language} readOnly />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default History;
