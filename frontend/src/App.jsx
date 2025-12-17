import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import Home from './pages/Home';
import History from './pages/History';
import Login from './pages/Login';
import Register from './pages/Register';
import Settings from './pages/Settings';
import AuthCallback from './pages/AuthCallback';
import './styles/index.css';

// Protected route wrapper
function ProtectedRoute({ children }) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="loading-overlay">
                <div className="loading-pulse">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

// Main app content with routing
function AppContent() {
    const { isAuthenticated, isLoading } = useAuth();

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

            <Header />

            <main className="main-content">
                <Routes>
                    {/* Public routes */}
                    <Route path="/login" element={
                        isAuthenticated ? <Navigate to="/" replace /> : <Login />
                    } />
                    <Route path="/register" element={
                        isAuthenticated ? <Navigate to="/" replace /> : <Register />
                    } />
                    <Route path="/auth/callback" element={<AuthCallback />} />

                    {/* Main app - accessible without login but with limited features */}
                    <Route path="/" element={<Home />} />
                    <Route path="/history" element={<History />} />

                    {/* Protected routes */}
                    <Route path="/settings" element={
                        <ProtectedRoute>
                            <Settings />
                        </ProtectedRoute>
                    } />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
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

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
