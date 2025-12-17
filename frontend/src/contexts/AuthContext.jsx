import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, logout as logoutApi, getAccessToken, clearTokens, refreshAccessToken } from '../services/auth';

const AuthContext = createContext(null);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const checkAuth = useCallback(async () => {
        const token = getAccessToken();
        if (!token) {
            setUser(null);
            setIsAuthenticated(false);
            setIsLoading(false);
            return;
        }

        try {
            const response = await getMe();
            if (response.success) {
                setUser(response.data);
                setIsAuthenticated(true);
            } else {
                throw new Error('Failed to get user');
            }
        } catch (error) {
            // Try to refresh token
            try {
                await refreshAccessToken();
                const response = await getMe();
                if (response.success) {
                    setUser(response.data);
                    setIsAuthenticated(true);
                }
            } catch (refreshError) {
                clearTokens();
                setUser(null);
                setIsAuthenticated(false);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const login = useCallback((userData, accessToken, refreshToken) => {
        setUser(userData);
        setIsAuthenticated(true);
    }, []);

    const logout = useCallback(async () => {
        await logoutApi();
        setUser(null);
        setIsAuthenticated(false);
    }, []);

    const refreshUser = useCallback(async () => {
        await checkAuth();
    }, [checkAuth]);

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated,
            isLoading,
            login,
            logout,
            refreshUser,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export default AuthContext;
