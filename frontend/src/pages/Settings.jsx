import { useState, useEffect } from 'react';
import { FiSettings, FiKey, FiSave, FiCheck, FiX, FiCpu, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { getSettings, updateLlmPreference, updateApiKeys, validateKey, getKeyStatus, removeLicenseKey } from '../services/auth';

function Settings() {
    const { user, refreshUser } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isValidating, setIsValidating] = useState(false);

    // Settings state
    const [preferredLlm, setPreferredLlm] = useState('gemini');
    const [geminiKey, setGeminiKey] = useState('');
    const [deepseekKey, setDeepseekKey] = useState('');
    const [licenseKey, setLicenseKey] = useState('');
    const [hasGeminiKey, setHasGeminiKey] = useState(false);
    const [hasDeepseekKey, setHasDeepseekKey] = useState(false);
    const [licenseStatus, setLicenseStatus] = useState('none');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const [settingsRes, keyStatusRes] = await Promise.all([
                getSettings(),
                getKeyStatus()
            ]);

            if (settingsRes.success) {
                setPreferredLlm(settingsRes.data.preferred_llm || 'gemini');
                setHasGeminiKey(settingsRes.data.hasGeminiKey);
                setHasDeepseekKey(settingsRes.data.hasDeepseekKey);
            }

            if (keyStatusRes.success) {
                setLicenseStatus(keyStatusRes.data.status);
            }
        } catch (error) {
            toast.error('Không thể tải cài đặt');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveLlm = async () => {
        setIsSaving(true);
        try {
            const response = await updateLlmPreference(preferredLlm);
            if (response.success) {
                toast.success('Đã lưu provider LLM');
            }
        } catch (error) {
            toast.error('Lưu thất bại');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveApiKeys = async () => {
        setIsSaving(true);
        try {
            const response = await updateApiKeys({
                gemini_api_key: geminiKey || undefined,
                deepseek_api_key: deepseekKey || undefined,
            });
            if (response.success) {
                setHasGeminiKey(response.data.hasGeminiKey);
                setHasDeepseekKey(response.data.hasDeepseekKey);
                setGeminiKey('');
                setDeepseekKey('');
                toast.success('Đã lưu API keys');
                refreshUser();
            }
        } catch (error) {
            toast.error('Lưu thất bại');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveApiKey = async (provider) => {
        if (!window.confirm(`Bạn có chắc muốn xóa ${provider === 'gemini' ? 'Gemini' : 'Deepseek'} API Key?`)) {
            return;
        }

        setIsSaving(true);
        try {
            const payload = provider === 'gemini'
                ? { gemini_api_key: '' }
                : { deepseek_api_key: '' };

            const response = await updateApiKeys(payload);

            if (response.success) {
                setHasGeminiKey(response.data.hasGeminiKey);
                setHasDeepseekKey(response.data.hasDeepseekKey);
                toast.success(`Đã xóa ${provider === 'gemini' ? 'Gemini' : 'Deepseek'} API Key`);
                refreshUser();
            }
        } catch (error) {
            toast.error('Xóa thất bại');
        } finally {
            setIsSaving(false);
        }
    };

    const handleValidateLicenseKey = async () => {
        if (!licenseKey) {
            toast.error('Vui lòng nhập license key');
            return;
        }

        setIsValidating(true);
        try {
            const response = await validateKey(licenseKey);
            if (response.success && response.data.valid) {
                setLicenseStatus('active');
                setLicenseKey('');
                toast.success('License key đã được kích hoạt!');
                refreshUser();
            } else {
                toast.error(response.data?.message || 'Key không hợp lệ');
            }
        } catch (error) {
            toast.error('Xác thực thất bại');
        } finally {
            setIsValidating(false);
        }
    };

    const handleRemoveLicenseKey = async () => {
        if (!window.confirm('Bạn có chắc muốn xóa License Key? Bạn sẽ mất quyền truy cập tài nguyên Premium.')) {
            return;
        }

        setIsValidating(true);
        try {
            const response = await removeLicenseKey();
            if (response.success) {
                setLicenseStatus('none');
                toast.success('Đã xóa License Key');
                refreshUser();
            }
        } catch (error) {
            toast.error('Xóa thất bại');
        } finally {
            setIsValidating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="settings-container">
                <div className="loading-overlay">
                    <div className="loading-pulse">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <p className="loading-text">Đang tải cài đặt...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="settings-container fade-in">
            <div className="settings-header">
                <h1><FiSettings /> Cài Đặt</h1>
                <p>Quản lý API keys và cài đặt LLM của bạn</p>
            </div>

            {/* LLM Provider Selection */}
            <div className="settings-section">
                <h2><FiCpu /> LLM Provider</h2>
                <p className="section-desc">Chọn provider AI để generate unit tests</p>

                <div className="llm-options">
                    <label className={`llm-option ${preferredLlm === 'gemini' ? 'selected' : ''}`}>
                        <input
                            type="radio"
                            name="llm"
                            value="gemini"
                            checked={preferredLlm === 'gemini'}
                            onChange={(e) => setPreferredLlm(e.target.value)}
                        />
                        <div className="llm-option-content">
                            <span className="llm-name">Google Gemini</span>
                            <span className="llm-desc">gemini-2.0-flash</span>
                            {hasGeminiKey && <span className="key-status has-key"><FiCheck /> Đã cấu hình</span>}
                        </div>
                    </label>

                    <label className={`llm-option ${preferredLlm === 'deepseek' ? 'selected' : ''}`}>
                        <input
                            type="radio"
                            name="llm"
                            value="deepseek"
                            checked={preferredLlm === 'deepseek'}
                            onChange={(e) => setPreferredLlm(e.target.value)}
                        />
                        <div className="llm-option-content">
                            <span className="llm-name">Deepseek</span>
                            <span className="llm-desc">deepseek-coder</span>
                            {hasDeepseekKey && <span className="key-status has-key"><FiCheck /> Đã cấu hình</span>}
                        </div>
                    </label>
                </div>

                <button
                    className="btn btn-primary"
                    onClick={handleSaveLlm}
                    disabled={isSaving}
                >
                    <FiSave /> Lưu Provider
                </button>
            </div>

            {/* API Keys */}
            <div className="settings-section">
                <h2><FiKey /> API Keys</h2>
                <p className="section-desc">Nhập API key của bạn để sử dụng dịch vụ LLM</p>

                <div className="form-group">
                    <label>Gemini API Key</label>
                    <div className="key-input-group">
                        <input
                            type="password"
                            value={geminiKey}
                            onChange={(e) => setGeminiKey(e.target.value)}
                            placeholder={hasGeminiKey ? '••••••••••••••••' : 'AIza...'}
                        />
                        {hasGeminiKey && (
                            <div className="key-actions">
                                <span className="key-saved"><FiCheck /> Đã lưu</span>
                                <button
                                    className="btn-icon danger"
                                    onClick={() => handleRemoveApiKey('gemini')}
                                    title="Xóa API Key"
                                >
                                    <FiTrash2 />
                                </button>
                            </div>
                        )}
                    </div>
                    <small>
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">
                            Lấy API key từ Google AI Studio
                        </a>
                    </small>
                </div>

                <div className="form-group">
                    <label>Deepseek API Key</label>
                    <div className="key-input-group">
                        <input
                            type="password"
                            value={deepseekKey}
                            onChange={(e) => setDeepseekKey(e.target.value)}
                            placeholder={hasDeepseekKey ? '••••••••••••••••' : 'sk-...'}
                        />
                        {hasDeepseekKey && (
                            <div className="key-actions">
                                <span className="key-saved"><FiCheck /> Đã lưu</span>
                                <button
                                    className="btn-icon danger"
                                    onClick={() => handleRemoveApiKey('deepseek')}
                                    title="Xóa API Key"
                                >
                                    <FiTrash2 />
                                </button>
                            </div>
                        )}
                    </div>
                    <small>
                        <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer">
                            Lấy API key từ Deepseek
                        </a>
                    </small>
                </div>

                <button
                    className="btn btn-primary"
                    onClick={handleSaveApiKeys}
                    disabled={isSaving || (!geminiKey && !deepseekKey)}
                >
                    <FiSave /> Lưu API Keys
                </button>
            </div>

            {/* License Key */}
            <div className="settings-section">
                <h2><FiKey /> License Key</h2>
                <p className="section-desc">Nhập license key từ admin.hailamdev.space</p>

                <div className="license-status">
                    Status: {' '}
                    {licenseStatus === 'active' ? (
                        <span className="status-active"><FiCheck /> Active</span>
                    ) : licenseStatus === 'expired' ? (
                        <span className="status-expired"><FiX /> Expired</span>
                    ) : (
                        <span className="status-none">Chưa kích hoạt</span>
                    )}
                </div>

                <div className="form-group">
                    <label>License Key</label>
                    <div className="key-input-group">
                        <input
                            type="text"
                            value={licenseKey}
                            onChange={(e) => setLicenseKey(e.target.value)}
                            placeholder="Nhập license key..."
                            disabled={licenseStatus === 'active'}
                        />
                        {licenseStatus === 'active' ? (
                            <button
                                className="btn btn-danger"
                                onClick={handleRemoveLicenseKey}
                                disabled={isValidating}
                            >
                                <FiTrash2 /> Gỡ Key
                            </button>
                        ) : (
                            <button
                                className="btn btn-secondary"
                                onClick={handleValidateLicenseKey}
                                disabled={isValidating || !licenseKey}
                            >
                                {isValidating ? 'Đang xác thực...' : 'Xác thực'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Settings;
