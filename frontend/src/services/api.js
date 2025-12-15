import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 120000, // 2 minutes for LLM calls
});

/**
 * Generate unit tests from source code
 */
export async function generateTests({ code, specs, framework, language }) {
    const response = await api.post('/generate', {
        code,
        specs,
        framework,
        language,
        saveHistory: true,
    });
    return response.data;
}

/**
 * Get generation history
 */
export async function getHistory(limit = 50, offset = 0) {
    const response = await api.get('/history', {
        params: { limit, offset },
    });
    return response.data;
}

/**
 * Get specific generation by ID
 */
export async function getGeneration(id) {
    const response = await api.get(`/history/${id}`);
    return response.data;
}

/**
 * Delete generation
 */
export async function deleteGeneration(id) {
    const response = await api.delete(`/history/${id}`);
    return response.data;
}

/**
 * Health check
 */
export async function healthCheck() {
    const response = await api.get('/health');
    return response.data;
}

export default api;
