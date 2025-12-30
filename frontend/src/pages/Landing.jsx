import { Link } from 'react-router-dom';
import { FiZap, FiCode, FiCpu, FiShield, FiClock, FiArrowRight, FiGithub } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { useEffect, useRef } from 'react';
import { googleLogin } from '../services/auth';
import '../styles/landing.css';

function Landing() {
    const stepRefs = useRef([]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                    }
                });
            },
            {
                threshold: 0.2,
                rootMargin: '-50px'
            }
        );

        stepRefs.current.forEach((ref) => {
            if (ref) observer.observe(ref);
        });

        return () => observer.disconnect();
    }, []);

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

                    <div className="workflow-steps">
                        {/* Step 1 */}
                        <div className="workflow-item scroll-reveal" ref={(el) => (stepRefs.current[0] = el)}>
                            <div className="step-content">
                                <div className="step-number-badge">1</div>
                                <h3 className="step-title">Paste Code</h3>
                                <p className="step-description">Dán code nguồn của bạn vào editor. Hệ thống sẽ tự động phân tích cấu trúc và logic của code.</p>
                            </div>
                            <div className="step-visual">
                                <img src="/B1.gif" alt="Paste Code Demo" className="step-gif" />
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="workflow-item scroll-reveal" ref={(el) => (stepRefs.current[1] = el)}>
                            <div className="step-content">
                                <div className="step-number-badge">2</div>
                                <h3 className="step-title">Chọn Framework</h3>
                                <p className="step-description">Chọn testing framework phù hợp với dự án của bạn. Hỗ trợ Pytest, Jest, Mocha và nhiều framework khác.</p>
                            </div>
                            <div className="step-visual">
                                <img src="/B2.gif" alt="Choose Framework Demo" className="step-gif" />
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="workflow-item scroll-reveal" ref={(el) => (stepRefs.current[2] = el)}>
                            <div className="step-content">
                                <div className="step-number-badge">3</div>
                                <h3 className="step-title">Generate</h3>
                                <p className="step-description">AI tự động tạo unit tests với độ bao phủ cao, kiểm tra edge cases và đảm bảo chất lượng code.</p>
                            </div>
                            <div className="step-visual">
                                <img src="/B3.gif" alt="Generate Tests Demo" className="step-gif" />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="cta-section">
                    <div className="cta-grid">
                        <div className="cta-video-container fade-in">
                            <div className="video-frame">
                                <div className="video-header">
                                    <div className="video-dots">
                                        <span className="dot red"></span>
                                        <span className="dot yellow"></span>
                                        <span className="dot green"></span>
                                    </div>
                                    <span className="video-title">Hướng dẫn sử dụng</span>
                                </div>
                                <video
                                    className="cta-video"
                                    controls
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                >
                                    <source src="/LLMs.mp4" type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                        </div>
                        <div className="cta-content">
                            <h2>Sẵn sàng bắt đầu?</h2>
                            <p>Đăng ký miễn phí và trải nghiệm sức mạnh của AI trong việc tạo unit tests ngay hôm nay!</p>
                            <div className="cta-actions">
                                <Link to="/register" className="btn btn-primary btn-large">
                                    <FiArrowRight /> Đăng ký ngay
                                </Link>
                                <Link to="/login" className="btn btn-secondary btn-large">
                                    Đăng nhập
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default Landing;
