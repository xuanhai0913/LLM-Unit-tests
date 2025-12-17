import { Link } from 'react-router-dom';
import { FiZap, FiCode, FiCpu, FiShield, FiClock, FiArrowRight, FiGithub } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { googleLogin } from '../services/auth';
import '../styles/landing.css';

function Landing() {
    const handleGoogleLogin = () => {
        googleLogin();
    };

    return (
        <div className="landing-page">
            <div className="landing-container">
                {/* Hero Section */}
                <section className="hero-section">
                    <div className="bg-glow bg-glow-1"></div>
                    <div className="bg-glow bg-glow-2"></div>
                    <div className="hero-content">
                        <div className="hero-badge">
                            <FiZap />
                            <span>Powered by AI</span>
                        </div>

                        <h1 className="hero-title">
                            Generate <span className="gradient-text">Unit Tests</span>
                            <br />
                            in Seconds
                        </h1>

                        <p className="hero-description">
                            Sử dụng sức mạnh của AI để tự động tạo unit tests chất lượng cao
                            cho code Python, JavaScript và TypeScript của bạn.
                        </p>

                        <div className="hero-actions">
                            <Link to="/register" className="btn btn-primary btn-large">
                                <FiArrowRight />
                                Bắt đầu miễn phí
                            </Link>
                            <button className="btn btn-google btn-large" onClick={handleGoogleLogin}>
                                <FcGoogle size={22} />
                                Đăng nhập với Google
                            </button>
                        </div>

                        <p className="hero-login-hint">
                            Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
                        </p>
                    </div>

                    {/* Hero Visual */}
                    <div className="hero-visual">
                        <div className="code-preview-card">
                            <div className="code-preview-header">
                                <div className="code-dots">
                                    <span className="dot red"></span>
                                    <span className="dot yellow"></span>
                                    <span className="dot green"></span>
                                </div>
                                <span className="code-filename">test_calculator.py</span>
                            </div>
                            <div className="code-preview-body">
                                <pre><code>{`import pytest
from calculator import Calculator

class TestCalculator:
    def test_add_positive_numbers(self):
        calc = Calculator()
        assert calc.add(2, 3) == 5
    
    def test_divide_by_zero(self):
        calc = Calculator()
        with pytest.raises(ZeroDivisionError):
            calc.divide(10, 0)`}</code></pre>
                            </div>
                            <div className="code-preview-badge">
                                <FiZap />
                                AI Generated
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="features-section" id="features">
                    <h2 className="section-title">Tại sao chọn <span className="gradient-text">LLM Project</span>?</h2>

                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon">
                                <FiCpu />
                            </div>
                            <h3>Đa LLM Provider</h3>
                            <p>Hỗ trợ Gemini và Deepseek, cho phép bạn chọn model phù hợp nhất.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                <FiCode />
                            </div>
                            <h3>Đa Ngôn Ngữ</h3>
                            <p>Hỗ trợ Python, JavaScript, TypeScript với các framework như pytest, Jest, Mocha.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                <FiClock />
                            </div>
                            <h3>Tiết Kiệm Thời Gian</h3>
                            <p>Tạo unit tests trong vài giây thay vì hàng giờ viết thủ công.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                <FiShield />
                            </div>
                            <h3>Bảo Mật</h3>
                            <p>API key của bạn được mã hóa và bảo vệ an toàn.</p>
                        </div>
                    </div>
                </section>

                {/* How It Works */}
                <section className="how-it-works-section" id="how-it-works">
                    <h2 className="section-title">Cách hoạt động</h2>

                    <div className="steps-container">
                        <div className="step">
                            <div className="step-number">1</div>
                            <h3>Paste Code</h3>
                            <p>Dán code nguồn của bạn vào editor</p>
                        </div>

                        <div className="step-arrow">→</div>

                        <div className="step">
                            <div className="step-number">2</div>
                            <h3>Chọn Framework</h3>
                            <p>Chọn testing framework phù hợp</p>
                        </div>

                        <div className="step-arrow">→</div>

                        <div className="step">
                            <div className="step-number">3</div>
                            <h3>Generate</h3>
                            <p>AI tự động tạo unit tests</p>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="cta-section">
                    <div className="cta-content">
                        <h2>Sẵn sàng bắt đầu?</h2>
                        <p>Đăng ký miễn phí và trải nghiệm ngay hôm nay!</p>
                        <div className="cta-actions">
                            <Link to="/register" className="btn btn-primary btn-large">
                                Đăng ký ngay
                            </Link>
                            <Link to="/login" className="btn btn-secondary btn-large">
                                Đăng nhập
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default Landing;
