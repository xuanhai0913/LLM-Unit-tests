import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const authApi = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Token management
const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export function getAccessToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken, refreshToken) {
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
}

export function clearTokens() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Register new user
 */
export async function register({ email, password, name }) {
    const response = await authApi.post('/auth/register', { email, password, name });
    if (response.data.success) {
        const { accessToken, refreshToken } = response.data.data;
        setTokens(accessToken, refreshToken);
    }
    return response.data;
}

/**
 * Login with email/password
 */
export async function login({ email, password }) {
    const response = await authApi.post('/auth/login', { email, password });
    if (response.data.success) {
        const { accessToken, refreshToken } = response.data.data;
        setTokens(accessToken, refreshToken);
    }
    return response.data;
}

/**
 * Refresh access token
 */
export async function refreshAccessToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
        throw new Error('No refresh token');
    }

    const response = await authApi.post('/auth/refresh', { refreshToken });
    if (response.data.success) {
        setTokens(response.data.data.accessToken, null);
    }
    return response.data;
}

/**
 * Get current user profile
 */
export async function getMe() {
    const token = getAccessToken();
    if (!token) {
        throw new Error('Not authenticated');
    }

    const response = await authApi.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
}

/**
 * Logout
 */
export async function logout() {
    try {
        await authApi.post('/auth/logout');
    } catch (e) {
        // Ignore logout errors
    }
    clearTokens();
}

/**
 * Redirect to Google OAuth
 */
export function googleLogin() {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    window.location.href = `${apiUrl}/auth/google`;
}

// Settings API
export async function getSettings() {
    const token = getAccessToken();
    const response = await authApi.get('/settings', {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
}

export async function updateLlmPreference(provider) {
    const token = getAccessToken();
    const response = await authApi.put('/settings/llm', { provider }, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
}

export async function updateApiKeys({ gemini_api_key, deepseek_api_key }) {
    const token = getAccessToken();
    const response = await authApi.put('/settings/api-keys', { gemini_api_key, deepseek_api_key }, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
}

// Key validation
export async function validateKey(key) {
    const token = getAccessToken();
    const response = await authApi.post('/keys/validate', { key }, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
}

export async function getKeyStatus() {
    const token = getAccessToken();
    const response = await authApi.get('/keys/status', {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
}

export default {
    register,
    login,
    logout,
    getMe,
    refreshAccessToken,
    googleLogin,
    getAccessToken,
    getSettings,
    updateLlmPreference,
    updateApiKeys,
    validateKey,
    getKeyStatus,
};
