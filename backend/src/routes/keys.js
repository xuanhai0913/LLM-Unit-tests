import express from 'express';
import axios from 'axios';
import { User } from '../models/index.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Admin API URL
const ADMIN_API_URL = 'https://admin.hailamdev.space';

/**
 * POST /api/keys/validate
 * Validate a license key with admin.hailamdev.space
 */
router.post('/validate', authenticateToken, async (req, res) => {
    try {
        const { key } = req.body;

        if (!key) {
            return res.status(400).json({ error: 'License key is required' });
        }

        try {
            // Call admin API: GET /api/quota?key={key}
            const response = await axios.get(`${ADMIN_API_URL}/api/quota`, {
                params: { key },
                timeout: 10000,
            });

            const data = response.data;

            // Check if key is valid and active
            if (data.isActive && data.quota > 0) {
                // Update user's license
                const user = await User.findByPk(req.user.id);
                user.license_key = key;
                user.license_status = 'active';
                user.license_valid_until = null; // No expiration from this API
                await user.save();

                return res.json({
                    success: true,
                    data: {
                        valid: true,
                        status: 'active',
                        quota: data.quota,
                        isActive: data.isActive,
                        createdAt: data.createdAt,
                        lastUsed: data.lastUsed,
                    },
                });
            } else {
                // Key exists but is not active or has no quota
                return res.json({
                    success: true,
                    data: {
                        valid: false,
                        message: data.isActive === false
                            ? 'License key đã bị vô hiệu hóa'
                            : 'License key đã hết quota',
                        quota: data.quota || 0,
                        isActive: data.isActive || false,
                    },
                });
            }
        } catch (apiError) {
            // Handle API errors
            if (apiError.response) {
                const status = apiError.response.status;
                const data = apiError.response.data;

                if (status === 404) {
                    return res.json({
                        success: true,
                        data: {
                            valid: false,
                            message: data.error || 'Invalid key',
                            quota: 0,
                            isActive: false,
                        },
                    });
                }

                if (status === 400) {
                    return res.status(400).json({
                        error: data.error || 'Key parameter is required'
                    });
                }
            }

            console.error('Admin API error:', apiError.message);
            return res.status(500).json({
                error: 'Không thể kết nối đến server xác thực'
            });
        }
    } catch (error) {
        console.error('Key validation error:', error);
        res.status(500).json({ error: 'Key validation failed' });
    }
});

/**
 * GET /api/keys/status
 * Get current license key status
 */
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // If user has a key, verify it's still valid
        if (user.license_key && user.license_status === 'active') {
            try {
                const response = await axios.get(`${ADMIN_API_URL}/api/quota`, {
                    params: { key: user.license_key },
                    timeout: 5000,
                });

                const data = response.data;

                // Update status if key became inactive
                if (!data.isActive || data.quota <= 0) {
                    user.license_status = data.isActive ? 'expired' : 'invalid';
                    await user.save();
                }

                return res.json({
                    success: true,
                    data: {
                        hasKey: true,
                        status: data.isActive && data.quota > 0 ? 'active' : 'inactive',
                        quota: data.quota,
                        isActive: data.isActive,
                        lastUsed: data.lastUsed,
                    },
                });
            } catch (apiError) {
                // If API fails, return cached status
                return res.json({
                    success: true,
                    data: {
                        hasKey: !!user.license_key,
                        status: user.license_status,
                        quota: null,
                        note: 'Không thể xác minh với server',
                    },
                });
            }
        }

        res.json({
            success: true,
            data: {
                hasKey: !!user.license_key,
                status: user.license_status || 'none',
            },
        });
    } catch (error) {
        console.error('Get key status error:', error);
        res.status(500).json({ error: 'Failed to get key status' });
    }
});

/**
 * DELETE /api/keys
 * Remove license key
 */
router.delete('/', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.license_key = null;
        user.license_status = 'none';
        user.license_valid_until = null;
        await user.save();

        res.json({ success: true, message: 'License key removed' });
    } catch (error) {
        console.error('Remove key error:', error);
        res.status(500).json({ error: 'Failed to remove key' });
    }
});

export default router;
