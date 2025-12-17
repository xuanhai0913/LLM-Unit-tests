import express from 'express';
import CryptoJS from 'crypto-js';
import { User } from '../models/index.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import config from '../config/index.js';

const router = express.Router();

/**
 * Encrypt API key for storage
 */
function encryptKey(key) {
    if (!key) return null;
    return CryptoJS.AES.encrypt(key, config.encryption.key).toString();
}

/**
 * Decrypt API key from storage
 */
function decryptKey(encryptedKey) {
    if (!encryptedKey) return null;
    const bytes = CryptoJS.AES.decrypt(encryptedKey, config.encryption.key);
    return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * GET /api/settings
 * Get current user settings
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            data: {
                preferred_llm: user.preferred_llm,
                hasGeminiKey: !!user.gemini_api_key,
                hasDeepseekKey: !!user.deepseek_api_key,
                license_key: user.license_key ? '••••••' + user.license_key.slice(-4) : null,
                license_status: user.license_status,
                license_valid_until: user.license_valid_until,
            },
        });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to get settings' });
    }
});

/**
 * PUT /api/settings/llm
 * Update preferred LLM provider
 */
router.put('/llm', authenticateToken, async (req, res) => {
    try {
        const { provider } = req.body;

        if (!provider || !['gemini', 'deepseek'].includes(provider)) {
            return res.status(400).json({ error: 'Invalid provider. Must be "gemini" or "deepseek"' });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.preferred_llm = provider;
        await user.save();

        res.json({
            success: true,
            data: { preferred_llm: user.preferred_llm },
        });
    } catch (error) {
        console.error('Update LLM error:', error);
        res.status(500).json({ error: 'Failed to update LLM preference' });
    }
});

/**
 * PUT /api/settings/api-keys
 * Save user's own API keys (encrypted)
 */
router.put('/api-keys', authenticateToken, async (req, res) => {
    try {
        const { gemini_api_key, deepseek_api_key } = req.body;

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Only update if provided (allow null to clear)
        if (gemini_api_key !== undefined) {
            user.gemini_api_key = gemini_api_key ? encryptKey(gemini_api_key) : null;
        }
        if (deepseek_api_key !== undefined) {
            user.deepseek_api_key = deepseek_api_key ? encryptKey(deepseek_api_key) : null;
        }

        await user.save();

        res.json({
            success: true,
            data: {
                hasGeminiKey: !!user.gemini_api_key,
                hasDeepseekKey: !!user.deepseek_api_key,
            },
        });
    } catch (error) {
        console.error('Update API keys error:', error);
        res.status(500).json({ error: 'Failed to update API keys' });
    }
});

/**
 * Helper to get decrypted API key for a user
 */
export function getUserApiKey(user, provider) {
    if (provider === 'gemini' && user.gemini_api_key) {
        return decryptKey(user.gemini_api_key);
    }
    if (provider === 'deepseek' && user.deepseek_api_key) {
        return decryptKey(user.deepseek_api_key);
    }
    return null;
}

export default router;
