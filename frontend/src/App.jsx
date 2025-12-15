import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Header from './components/Header';
import Home from './pages/Home';
import History from './pages/History';
import './styles/index.css';

function App() {
    const [currentPage, setCurrentPage] = useState('home');

    return (
        <div className="app">
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 3000,
                    style: {
                        background: '#1e1e30',
                        color: '#fff',
                        borderRadius: '10px',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                    },
                    success: {
                        iconTheme: { primary: '#10b981', secondary: '#fff' }
                    },
                    error: {
                        iconTheme: { primary: '#ef4444', secondary: '#fff' }
                    }
                }}
            />
            <Header currentPage={currentPage} setCurrentPage={setCurrentPage} />
            <main className="main-content">
                {currentPage === 'home' ? <Home /> : <History />}
            </main>
            <footer style={{
                textAlign: 'center',
                padding: '2rem 1rem',
                color: '#94a3b8',
                fontSize: '0.9rem',
                marginTop: 'auto',
                borderTop: '1px solid rgba(148, 163, 184, 0.1)'
            }}>
                <p>
                    By <a href="https://hailamdev.space" target="_blank" rel="noopener noreferrer" style={{ color: '#8b5cf6', textDecoration: 'none' }}>Nguyễn Xuân Hải</a> và Nguyễn Thanh Hải
                </p>
            </footer>
        </div>
    );
}

export default App;
