import { FiHome, FiClock } from 'react-icons/fi';

function Header({ currentPage, setCurrentPage }) {
    return (
        <header className="header">
            <div className="header-content">
                <div className="logo">
                    <img src="/logo.png" alt="LLM Project" className="logo-image" />
                    <span className="logo-text">LLM Project</span>
                </div>

                <nav className="nav">
                    <button
                        className={`nav-btn ${currentPage === 'home' ? 'active' : ''}`}
                        onClick={() => setCurrentPage('home')}
                    >
                        <FiHome />
                        Generator
                    </button>
                    <button
                        className={`nav-btn ${currentPage === 'history' ? 'active' : ''}`}
                        onClick={() => setCurrentPage('history')}
                    >
                        <FiClock />
                        History
                    </button>
                </nav>
            </div>
        </header>
    );
}

export default Header;
