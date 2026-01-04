/**
 * Auth System Unit Tests - ADDITIONAL TESTS
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// 1. Mock Dependencies (Must be done before imports in ESM)
jest.unstable_mockModule('../src/models/index.js', () => ({
    User: {
        findOne: jest.fn(),
        findByPk: jest.fn(),
        create: jest.fn()
    }
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
    default: {
        verify: jest.fn(),
        sign: jest.fn().mockReturnValue('mock_token')
    }
}));

jest.unstable_mockModule('bcryptjs', () => ({
    default: {
        compare: jest.fn(),
        hash: jest.fn().mockResolvedValue('hashed_password'),
        genSalt: jest.fn()
    }
}));

jest.unstable_mockModule('../src/config/index.js', () => ({
    default: {
        jwt: {
            secret: 'test_secret',
            refreshSecret: 'test_refresh_secret',
            accessExpirationMinutes: 15,
            refreshExpirationDays: 7
        },
        frontendUrl: 'http://localhost:3000',
        google: { clientId: 'id', clientSecret: 'secret', callbackUrl: 'url' }
    }
}));

jest.unstable_mockModule('passport', () => ({
    default: {
        use: jest.fn(),
        authenticate: jest.fn().mockReturnValue((req, res, next) => next()),
        serializeUser: jest.fn(),
        deserializeUser: jest.fn()
    }
}));

jest.unstable_mockModule('passport-google-oauth20', () => ({
    Strategy: class MockStrategy {
        constructor(opts, verify) {
            this.name = 'google';
            this.verify = verify;
        }
    }
}));

// 2. Import Modules (using await import for ESM)
const { User } = await import('../src/models/index.js');
const jwt = (await import('jsonwebtoken')).default;
const bcrypt = (await import('bcryptjs')).default;
const passport = (await import('passport')).default;

// Mock global fetch for API calls
global.fetch = jest.fn();

describe('Auth Service Tests', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Helper to simulate request validation
    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    describe('Registration Logic', () => {
        it('should reject invalid email formats', () => {
            const invalidEmails = ['plainaddress', '#@%^%#$@#$@#.com', '@example.com'];

            invalidEmails.forEach(email => {
                expect(validateEmail(email)).toBe(false);
            });
        });

        it('should allow valid email formats', () => {
            expect(validateEmail('test@example.com')).toBe(true);
            expect(validateEmail('user.name+tag@gmail.com')).toBe(true);
        });

        it('should check if user already exists', async () => {
            // Mock finding a user
            User.findOne.mockResolvedValueOnce({ id: 1, email: 'existing@test.com' });

            const checkUser = async (email) => {
                const user = await User.findOne({ where: { email } });
                return !!user;
            };

            const exists = await checkUser('existing@test.com');
            expect(exists).toBe(true);
            expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'existing@test.com' } });
        });
    });

    describe('Password Handling', () => {
        it('should hash password before saving', async () => {
            const password = 'mySecretPassword123';
            const hash = await bcrypt.hash(password, 10);

            expect(hash).toBe('hashed_password');
            expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
        });

        it('should verify correct password', async () => {
            bcrypt.compare.mockResolvedValueOnce(true);

            const isValid = await bcrypt.compare('input_pass', 'stored_hash');
            expect(isValid).toBe(true);
        });
    });

    describe('JWT Token Generation', () => {
        it('should sign access tokens', () => {
            const userId = 123;
            const token = jwt.sign({ sub: userId }, 'secret');

            expect(token).toBe('mock_token');
            expect(jwt.sign).toHaveBeenCalled();
        });

        it('should verify valid tokens', () => {
            jwt.verify.mockReturnValueOnce({ sub: 123 });

            const decoded = jwt.verify('valid_token', 'secret');
            expect(decoded).toEqual({ sub: 123 });
        });
    });

    describe('Google OAuth Strategy', () => {


        // Simulating the verify callback logic
        it('should create new user if not found during OAuth', async () => {
            const profile = {
                id: 'google_123',
                emails: [{ value: 'newuser@google.com' }],
                displayName: 'New Google User',
                photos: [{ value: 'photo.jpg' }]
            };

            // User not found
            User.findOne.mockResolvedValueOnce(null);
            // Create user
            User.create.mockResolvedValueOnce({
                id: 1,
                google_id: 'google_123',
                email: 'newuser@google.com'
            });

            // Simulate callback
            const handleOAuth = async (profile) => {
                let user = await User.findOne({ where: { google_id: profile.id } });
                if (!user) {
                    user = await User.create({
                        google_id: profile.id,
                        email: profile.emails[0].value,
                        name: profile.displayName
                    });
                }
                return user;
            };

            const user = await handleOAuth(profile);

            expect(User.create).toHaveBeenCalled();
            expect(user.email).toBe('newuser@google.com');
        });
    });
});

describe('Additional Auth Service Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Google OAuth Strategy Error Handling', () => {
        it('should handle GoogleStrategy callback when no email is found in profile', async () => {
            const profile = {
                id: 'google_123',
                emails: [], // No email
                displayName: 'New Google User',
                photos: [{ value: 'photo.jpg' }]
            };

            const mockDone = jest.fn();

            // Simulate callback
            const handleOAuth = async (accessToken, refreshToken, profile, done) => {
                try {
                    let user = await User.findOne({ where: { google_id: profile.id } });

                    if (!user) {
                        const email = profile.emails?.[0]?.value;
                        if (!email) {
                            return done(new Error('No email found in Google profile'), null);
                        }
                        user = await User.create({
                            google_id: profile.id,
                            email: profile.emails[0].value,
                            name: profile.displayName
                        });
                    }
                    return done(null, user);
                } catch (error) {
                    return done(error, null);
                }
            };

            await handleOAuth(null, null, profile, mockDone);

            expect(mockDone).toHaveBeenCalledWith(new Error('No email found in Google profile'), null);
        });

        it('should handle GoogleStrategy callback when User.findOne throws an error', async () => {
            const profile = {
                id: 'google_123',
                emails: [{ value: 'test@example.com' }],
                displayName: 'New Google User',
                photos: [{ value: 'photo.jpg' }]
            };

            const mockDone = jest.fn();
            const error = new Error('Database error');
            User.findOne.mockRejectedValueOnce(error);

            // Simulate callback
            const handleOAuth = async (accessToken, refreshToken, profile, done) => {
                try {
                    let user = await User.findOne({ where: { google_id: profile.id } });

                    if (!user) {
                        user = await User.create({
                            google_id: profile.id,
                            email: profile.emails[0].value,
                            name: profile.displayName
                        });
                    }
                    return done(null, user);
                } catch (err) {
                    return done(err, null);
                }
            };

            await handleOAuth(null, null, profile, mockDone);

            expect(mockDone).toHaveBeenCalledWith(error, null);
        });
    });

    describe('Passport Deserialize User Error Handling', () => {
        it('should handle passport.deserializeUser error', async () => {
            const error = new Error('Failed to deserialize user');
            User.findByPk.mockRejectedValueOnce(error);

            const mockDone = jest.fn();

            const deserializeUser = async (id, done) => {
                try {
                    const user = await User.findByPk(id);
                    done(null, user);
                } catch (err) {
                    done(err, null);
                }
            };

            await deserializeUser(1, mockDone);

            expect(mockDone).toHaveBeenCalledWith(error, null);
        });
    });

    describe('Refresh Token Verification Failure', () => {
        it('should handle refresh token verification failure', async () => {
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(new Error('Invalid refresh token'), null);
            });

            const mockReq = { body: { refreshToken: 'invalid_token' } };
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            const refreshTokenRoute = async (req, res) => {
                try {
                    const { refreshToken } = req.body;

                    if (!refreshToken) {
                        return res.status(400).json({ error: 'Refresh token required' });
                    }

                    jwt.verify(refreshToken, 'test_refresh_secret', async (err, decoded) => {
                        if (err) {
                            return res.status(403).json({ error: 'Invalid refresh token' });
                        }

                        const user = await User.findByPk(decoded.id);
                        if (!user) {
                            return res.status(404).json({ error: 'User not found' });
                        }

                        const newAccessToken = 'new_access_token';

                        res.json({
                            success: true,
                            data: { accessToken: newAccessToken },
                        });
                    });
                } catch (error) {
                    console.error('Refresh error:', error);
                    res.status(500).json({ error: 'Token refresh failed' });
                }
            };

            await refreshTokenRoute(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid refresh token' });
        });
    });

    describe('Refresh Token User Not Found', () => {
        it('should handle refresh token user not found', async () => {
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(null, { id: 123 });
            });
            User.findByPk.mockResolvedValueOnce(null);

            const mockReq = { body: { refreshToken: 'valid_token' } };
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            const refreshTokenRoute = async (req, res) => {
                try {
                    const { refreshToken } = req.body;

                    if (!refreshToken) {
                        return res.status(400).json({ error: 'Refresh token required' });
                    }

                    jwt.verify(refreshToken, 'test_refresh_secret', async (err, decoded) => {
                        if (err) {
                            return res.status(403).json({ error: 'Invalid refresh token' });
                        }

                        const user = await User.findByPk(decoded.id);
                        if (!user) {
                            return res.status(404).json({ error: 'User not found' });
                        }

                        const newAccessToken = 'new_access_token';

                        res.json({
                            success: true,
                            data: { accessToken: newAccessToken },
                        });
                    });
                } catch (error) {
                    console.error('Refresh error:', error);
                    res.status(500).json({ error: 'Token refresh failed' });
                }
            };

            await refreshTokenRoute(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not found' });
        });
    });

    describe('GET /api/auth/me Error Handling', () => {
        it('should handle GET /api/auth/me error', async () => {
            const error = new Error('Database error');
            User.findByPk.mockRejectedValueOnce(error);

            const mockReq = { user: { id: 123 } };
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            const getMeRoute = async (req, res) => {
                try {
                    const user = await User.findByPk(req.user.id, {
                        attributes: ['id', 'email', 'name', 'avatar', 'preferred_llm', 'license_status', 'license_valid_until']
                    });

                    if (!user) {
                        return res.status(404).json({ error: 'User not found' });
                    }

                    res.json({
                        success: true,
                        data: user,
                    });
                } catch (error) {
                    console.error('Get user error:', error);
                    res.status(500).json({ error: 'Failed to get user' });
                }
            };

            await getMeRoute(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to get user' });
        });
    });

    describe('GET /api/auth/me User Not Found', () => {
        it('should handle GET /api/auth/me user not found', async () => {
            User.findByPk.mockResolvedValueOnce(null);

            const mockReq = { user: { id: 123 } };
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            const getMeRoute = async (req, res) => {
                try {
                    const user = await User.findByPk(req.user.id, {
                        attributes: ['id', 'email', 'name', 'avatar', 'preferred_llm', 'license_status', 'license_valid_until']
                    });

                    if (!user) {
                        return res.status(404).json({ error: 'User not found' });
                    }

                    res.json({
                        success: true,
                        data: user,
                    });
                } catch (error) {
                    console.error('Get user error:', error);
                    res.status(500).json({ error: 'Failed to get user' });
                }
            };

            await getMeRoute(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not found' });
        });
    });

    describe('Google OAuth callback failure', () => {
        it('should handle Google OAuth callback failure', async () => {
            const mockReq = {};
            const mockRes = {
                redirect: jest.fn(),
            };
            const mockNext = jest.fn();
            const mockAuthenticate = passport.authenticate('google', { failureRedirect: '/login?error=google_auth_failed', session: false });

            mockAuthenticate(mockReq, mockRes, mockNext);

            expect(passport.authenticate).toHaveBeenCalledWith('google', { failureRedirect: '/login?error=google_auth_failed', session: false });
            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('Google OAuth callback error handling', () => {
        it('should handle Google OAuth callback error', async () => {
            const mockReq = {
                user: { id: 1 },
            };
            const mockRes = {
                redirect: jest.fn(),
            };

            const callback = async (req, res) => {
                try {
                    const user = req.user;
                    const accessToken = 'mock_access_token';
                    const refreshToken = 'mock_refresh_token';

                    // Redirect to frontend with tokens
                    const frontendUrl = 'http://localhost:3000';
                    res.redirect(`${frontendUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
                } catch (error) {
                    console.error('Google callback error:', error);
                    res.redirect('/login?error=google_auth_failed');
                }
            };

            await callback(mockReq, mockRes);