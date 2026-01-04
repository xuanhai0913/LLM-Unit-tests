import axios from 'axios';
import { getAccessToken } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 120000, // 2 minutes for LLM calls
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

/**
 * Generate unit tests from source code
 */
export async function generateTests({ code, specs, framework, language, llmProvider, referenceCode, customInstructions }) {
    const response = await api.post('/generate', {
        code,
        specs,
        framework,
        language,
        llmProvider,
        saveHistory: true,
        referenceCode,
        customInstructions
    });
    return response.data;
}

/**
 * Run generated unit tests
 */
export async function runTests({ code, tests, language }) {
    const response = await api.post('/test/run', {
        code,
        tests,
        language
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

/**
 * Analyze existing tests to identify coverage gaps
 */
export async function analyzeTests({ sourceCode, existingTests, language, framework }) {
    const response = await api.post('/improve/analyze', {
        sourceCode,
        existingTests,
        language,
        framework
    });
    return response.data;
}

/**
 * Generate additional tests to fill coverage gaps
 */
export async function generateImprovements({ sourceCode, existingTests, language, framework, gaps, llmProvider, projectContext }) {
    const response = await api.post('/improve/generate', {
        sourceCode,
        existingTests,
        language,
        framework,
        gaps,
        llmProvider,
        projectContext // NEW: Send related files for context
    });
    return response.data;
}

export default api;
