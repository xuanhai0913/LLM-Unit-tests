import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setTokens } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';

/**
 * OAuth callback handler
 * Receives tokens from backend after Google OAuth and stores them
 */
function AuthCallback() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { refreshUser } = useAuth();

    useEffect(() => {
        const accessToken = searchParams.get('accessToken');
        const refreshToken = searchParams.get('refreshToken');
        const error = searchParams.get('error');

        if (error) {
            console.error('Auth error:', error);
            navigate('/login?error=' + error);
            return;
        }

        if (accessToken) {
            setTokens(accessToken, refreshToken);
            refreshUser().then(() => {
                navigate('/');
            });
        } else {
            navigate('/login');
        }
    }, [searchParams, navigate, refreshUser]);

    return (
        <div className="auth-callback">
            <div className="loading-overlay">
                <div className="loading-pulse">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <p className="loading-text">Đang xác thực...</p>
            </div>
        </div>
    );
}

export default AuthCallback;
