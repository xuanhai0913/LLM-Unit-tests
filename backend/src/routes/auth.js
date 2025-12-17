import express from 'express';
import bcrypt from 'bcryptjs';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/index.js';
import { authenticateToken, generateAccessToken, generateRefreshToken } from '../middleware/authMiddleware.js';
import config from '../config/index.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Configure Passport Google Strategy
if (config.google.clientId && config.google.clientSecret) {
    passport.use(new GoogleStrategy({
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            // Find or create user
            let user = await User.findOne({ where: { google_id: profile.id } });

            if (!user) {
                // Check if email already exists
                user = await User.findOne({ where: { email: profile.emails[0].value } });

                if (user) {
                    // Link Google account to existing user
                    user.google_id = profile.id;
                    user.avatar = profile.photos?.[0]?.value || user.avatar;
                    await user.save();
                } else {
                    // Create new user
                    user = await User.create({
                        email: profile.emails[0].value,
                        name: profile.displayName,
                        google_id: profile.id,
                        avatar: profile.photos?.[0]?.value,
                    });
                }
            }

            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    }));
}

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findByPk(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

/**
 * POST /api/auth/register
 * Register new user with email/password
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if user exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            email,
            password_hash,
            name: name || email.split('@')[0],
        });

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    avatar: user.avatar,
                    preferred_llm: user.preferred_llm,
                },
                accessToken,
                refreshToken,
            },
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

/**
 * POST /api/auth/login
 * Login with email/password
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if user has password (not Google-only)
        if (!user.password_hash) {
            return res.status(401).json({ error: 'Please use Google login for this account' });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    avatar: user.avatar,
                    preferred_llm: user.preferred_llm,
                },
                accessToken,
                refreshToken,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token required' });
        }

        jwt.verify(refreshToken, config.jwt.refreshSecret, async (err, decoded) => {
            if (err) {
                return res.status(403).json({ error: 'Invalid refresh token' });
            }

            const user = await User.findByPk(decoded.id);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            const newAccessToken = generateAccessToken(user);

            res.json({
                success: true,
                data: { accessToken: newAccessToken },
            });
        });
    } catch (error) {
        console.error('Refresh error:', error);
        res.status(500).json({ error: 'Token refresh failed' });
    }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'email', 'name', 'avatar', 'preferred_llm', 'license_status', 'license_valid_until']
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if user has own API keys configured
        const fullUser = await User.findByPk(req.user.id);
        const hasGeminiKey = !!fullUser.gemini_api_key;
        const hasDeepseekKey = !!fullUser.deepseek_api_key;

        res.json({
            success: true,
            data: {
                ...user.toJSON(),
                hasGeminiKey,
                hasDeepseekKey,
            },
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

/**
 * GET /api/auth/google
 * Initiate Google OAuth
 */
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

/**
 * GET /api/auth/google/callback
 * Google OAuth callback
 */
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login?error=google_auth_failed', session: false }),
    (req, res) => {
        try {
            const user = req.user;
            const accessToken = generateAccessToken(user);
            const refreshToken = generateRefreshToken(user);

            // Redirect to frontend with tokens
            const frontendUrl = config.frontendUrl || 'http://localhost:5173';
            res.redirect(`${frontendUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
        } catch (error) {
            console.error('Google callback error:', error);
            res.redirect('/login?error=auth_failed');
        }
    }
);

/**
 * POST /api/auth/logout
 * Logout (client should discard tokens)
 */
router.post('/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
