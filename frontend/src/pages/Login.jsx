import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiMail, FiLock, FiLogIn } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import toast from 'react-hot-toast';
import { login as loginApi, googleLogin } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';

function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email || !password) {
            toast.error('Vui lòng nhập email và mật khẩu');
            return;
        }

        setIsLoading(true);
        try {
            const response = await loginApi({ email, password });
            if (response.success) {
                login(response.data.user);
                toast.success('Đăng nhập thành công!');
                navigate('/');
            } else {
                throw new Error(response.error || 'Đăng nhập thất bại');
            }
        } catch (error) {
            toast.error(error.response?.data?.error || error.message || 'Đăng nhập thất bại');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        googleLogin();
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>Đăng Nhập</h1>
                    <p>Chào mừng bạn quay trở lại!</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="email">
                            <FiMail />
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">
                            <FiLock />
                            Mật khẩu
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            disabled={isLoading}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-full"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="loading-spinner"></span>
                                Đang đăng nhập...
                            </>
                        ) : (
                            <>
                                <FiLogIn />
                                Đăng Nhập
                            </>
                        )}
                    </button>
                </form>

                <div className="auth-divider">
                    <span>hoặc</span>
                </div>

                <button
                    className="btn btn-google btn-full"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                >
                    <FcGoogle size={20} />
                    Đăng nhập với Google
                </button>

                <p className="auth-footer">
                    Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
                </p>
            </div>
        </div>
    );
}

export default Login;
