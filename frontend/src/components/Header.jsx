import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiClock, FiSettings, FiLogIn, FiLogOut, FiUser } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';

function Header() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, isAuthenticated, logout } = useAuth();

    const currentPage = location.pathname;

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <header className="header">
            <div className="header-content">
                <Link to="/" className="logo">
                    <img src="/logo.png" alt="LLM Project" className="logo-image" />
                    <span className="logo-text">LLM Project</span>
                </Link>

                <nav className="nav">
                    <Link
                        to="/"
                        className={`nav-btn ${currentPage === '/' ? 'active' : ''}`}
                    >
                        <FiHome />
                        Generator
                    </Link>
                    <Link
                        to="/history"
                        className={`nav-btn ${currentPage === '/history' ? 'active' : ''}`}
                    >
                        <FiClock />
                        History
                    </Link>
                    {isAuthenticated && (
                        <Link
                            to="/settings"
                            className={`nav-btn ${currentPage === '/settings' ? 'active' : ''}`}
                        >
                            <FiSettings />
                            Settings
                        </Link>
                    )}
                </nav>

                <div className="header-auth">
                    {isAuthenticated ? (
                        <div className="user-menu">
                            <div className="user-info">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt={user.name} className="user-avatar" />
                                ) : (
                                    <div className="user-avatar-placeholder">
                                        <FiUser />
                                    </div>
                                )}
                                <span className="user-name">{user?.name || user?.email}</span>
                            </div>
                            <button className="btn btn-ghost" onClick={handleLogout}>
                                <FiLogOut />
                                Logout
                            </button>
                        </div>
                    ) : (
                        <Link to="/login" className="btn btn-primary btn-sm">
                            <FiLogIn />
                            Login
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}

export default Header;
