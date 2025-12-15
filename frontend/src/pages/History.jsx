import { useState, useEffect } from 'react';
import { FiTrash2, FiClock, FiCode, FiEye, FiX, FiCopy, FiDownload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getHistory, getGeneration, deleteGeneration } from '../services/api';
import CodeEditor from '../components/CodeEditor';

function History() {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

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
        setDetailLoading(true);
        try {
            const result = await getGeneration(id);
            if (result.success) {
                setSelectedItem(result.data);
            }
        } catch (error) {
            toast.error('Failed to load details');
        } finally {
            setDetailLoading(false);
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
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (isLoading) {
        return (
            <div className="history-container fade-in">
                <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
                    <span className="loading-spinner" style={{ width: 40, height: 40 }}></span>
                    <p style={{ marginTop: 'var(--spacing-md)', color: 'var(--text-muted)' }}>Loading history...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="history-container fade-in">
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">
                        <FiClock />
                        Generation History
                    </h2>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {history.length} items
                    </span>
                </div>

                {history.length === 0 ? (
                    <div className="empty-state">
                        <FiCode className="empty-state-icon" />
                        <h3>No generations yet</h3>
                        <p>Your test generations will appear here</p>
                    </div>
                ) : (
                    <div className="history-list">
                        {history.map((item) => (
                            <div
                                key={item.id}
                                className="history-item"
                                onClick={() => handleViewItem(item.id)}
                            >
                                <div className="history-item-info">
                                    <div className="history-item-meta">
                                        <span className="badge badge-framework">{item.framework}</span>
                                        <span className="badge badge-language">{item.language}</span>
                                        <span>
                                            <FiClock style={{ marginRight: 4 }} />
                                            {formatDate(item.createdAt)}
                                        </span>
                                        {item.generationTime && (
                                            <span>{(item.generationTime / 1000).toFixed(1)}s</span>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
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
            </div>

            {/* Detail Modal */}
            {selectedItem && (
                <div
                    className="modal-overlay"
                    onClick={() => setSelectedItem(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: 'var(--spacing-lg)',
                    }}
                >
                    <div
                        className="card"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            maxWidth: 900,
                            width: '100%',
                            maxHeight: '90vh',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <div className="card-header">
                            <h2 className="card-title">
                                <FiCode />
                                Generation Details
                            </h2>
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
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

                        <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                            <span className="badge badge-framework">{selectedItem.framework}</span>
                            <span className="badge badge-language">{selectedItem.language}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                {formatDate(selectedItem.createdAt)}
                            </span>
                        </div>

                        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <h4 style={{ marginBottom: 'var(--spacing-sm)', color: 'var(--text-secondary)' }}>Source Code</h4>
                                <div className="editor-container" style={{ flex: 1, minHeight: 300 }}>
                                    <CodeEditor value={selectedItem.sourceCode} language={selectedItem.language} readOnly />
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <h4 style={{ marginBottom: 'var(--spacing-sm)', color: 'var(--text-secondary)' }}>Generated Tests</h4>
                                <div className="editor-container" style={{ flex: 1, minHeight: 300 }}>
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
