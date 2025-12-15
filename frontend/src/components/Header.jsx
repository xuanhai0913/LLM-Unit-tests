import { FiCode, FiClock, FiHome } from 'react-icons/fi';

function Header({ currentPage, setCurrentPage }) {
    return (
        <header className="header">
            <div className="header-content">
                <div className="logo">
                    <FiCode className="logo-icon" />
                    <span>LLM Unit Test Generator</span>
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
