import axios from 'axios';

/**
 * Dashboard Proxy Client
 * Calls the admin.hailamdev.space proxy API to use System Gemini Keys
 */

const ADMIN_API_URL = process.env.ADMIN_API_URL || 'https://admin.hailamdev.space';

/**
 * Generate text using Dashboard's System Gemini Keys via proxy
 * @param {string} licenseKey - User's license key
 * @param {string} prompt - The prompt to send
 * @returns {Promise<string>} Generated text response
 */
export async function generateWithDashboardProxy(licenseKey, prompt) {
    if (!licenseKey) {
        throw new Error('License key is required to use Dashboard proxy');
    }

    try {
        const response = await axios.post(
            `${ADMIN_API_URL}/api/llm-proxy`,
            {
                userKey: licenseKey,
                prompt: prompt,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 120000, // 2 minutes
            }
        );

        // Handle response
        if (response.data?.text) {
            return response.data.text;
        }

        // If streaming response, collect all chunks
        if (typeof response.data === 'string') {
            return response.data;
        }

        throw new Error('Unexpected response format from Dashboard proxy');
    } catch (error) {
        if (error.response) {
            const status = error.response.status;
            const message = error.response.data?.error || 'Unknown error';

            if (status === 403) {
                throw new Error(`License key invalid or quota exceeded: ${message}`);
            }
            if (status === 503) {
                throw new Error(`No active API keys available: ${message}`);
            }

            throw new Error(`Dashboard proxy error (${status}): ${message}`);
        }

        throw new Error(`Failed to connect to Dashboard proxy: ${error.message}`);
    }
}

/**
 * Check if Dashboard proxy is available
 * @param {string} licenseKey - User's license key
 * @returns {Promise<{available: boolean, quota: number}>}
 */
export async function checkDashboardProxyStatus(licenseKey) {
    try {
        const response = await axios.get(`${ADMIN_API_URL}/api/quota`, {
            params: { key: licenseKey },
            timeout: 5000,
        });

        return {
            available: response.data.isActive && response.data.quota > 0,
            quota: response.data.quota || 0,
            isActive: response.data.isActive || false,
        };
    } catch (error) {
        return {
            available: false,
            quota: 0,
            isActive: false,
        };
    }
}

export default {
    generateWithDashboardProxy,
    checkDashboardProxyStatus,
};
