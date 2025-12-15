import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Header from './components/Header';
import Home from './pages/Home';
import History from './pages/History';

function App() {
    const [currentPage, setCurrentPage] = useState('home');

    return (
        <div className="app">
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                    },
                }}
            />
            <Header currentPage={currentPage} setCurrentPage={setCurrentPage} />
            <main className="main-content">
                {currentPage === 'home' && <Home />}
                {currentPage === 'history' && <History />}
            </main>
        </div>
    );
}

export default App;
