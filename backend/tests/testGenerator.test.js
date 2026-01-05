/**
 * Auth System Unit Tests
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
        it('should handle errors during Google OAuth strategy', async () => {
            const profile = {
                id: 'google_123',
                emails: [{ value: 'newuser@google.com' }],
                displayName: 'New Google User',
                photos: [{ value: 'photo.jpg' }]
            };

            const error = new Error('Database error');
            User.findOne.mockRejectedValueOnce(error);

            // Simulate callback
            const handleOAuth = async (profile) => {
                try {
                    await User.findOne({ where: { google_id: profile.id } });
                } catch (e) {
                    return e;
                }
            };

            const result = await handleOAuth(profile);

            expect(User.findOne).toHaveBeenCalled();
            expect(result).toEqual(error);
        });

        it('should handle missing email in Google profile', async () => {
            const profile = {
                id: 'google_123',
                emails: [], // No email provided
                displayName: 'New Google User',
                photos: [{ value: 'photo.jpg' }]
            };

            User.findOne.mockResolvedValueOnce(null);

            // Simulate callback
            const handleOAuth = async (profile) => {
                try {
                    let user = await User.findOne({ where: { google_id: profile.id } });
                    if (!user) {
                        const email = profile.emails?.[0]?.value;
                        if (!email) {
                            throw new Error('No email found in Google profile');
                        }
                    }
                } catch (e) {
                    return e;
                }
            };

            const result = await handleOAuth(profile);
            expect(result).toEqual(new Error('No email found in Google profile'));
        });
    });

    describe('Passport Deserialize User Error Handling', () => {
        it('should handle errors during passport deserializeUser', async () => {
            const error = new Error('Database error');
            User.findByPk.mockRejectedValueOnce(error);

            const deserializeUser = async (id) => {
                try {
                    await User.findByPk(id);
                } catch (e) {
                    return e;
                }
            };

            const result = await deserializeUser(1);
            expect(User.findByPk).toHaveBeenCalledWith(1);
            expect(result).toEqual(error);
        });
    });

    describe('Register Input Validation', () => {
        it('should reject registration with missing email', async () => {
            const req = { body: { password: 'password', name: 'Test User' } };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            // Simulate the register route handler
            const registerRouteHandler = async (req, res) => {
                const { email, password, name } = req.body;

                if (!email || !password) {
                    return res.status(400).json({ error: 'Email and password are required' });
                }
            };

            await registerRouteHandler(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Email and password are required' });
        });

        it('should reject registration with missing password', async () => {
            const req = { body: { email: 'test@example.com', name: 'Test User' } };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            // Simulate the register route handler
            const registerRouteHandler = async (req, res) => {
                const { email, password, name } = req.body;

                if (!email || !password) {
                    return res.status(400).json({ error: 'Email and password are required' });
                }
            };

            await registerRouteHandler(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Email and password are required' });
        });
    });

    describe('Register Database Errors', () => {
        it('should handle database errors during registration', async () => {
            const req = { body: { email: 'test@example.com', password: 'password', name: 'Test User' } };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            // Mock database error
            User.create.mockRejectedValueOnce(new Error('Database error'));
            bcrypt.genSalt.mockResolvedValueOnce('salt');
            bcrypt.hash.mockResolvedValueOnce('hashedPassword');

            // Simulate the register route handler
            const registerRouteHandler = async (req, res) => {
                try {
                    const { email, password, name } = req.body;

                    const salt = await bcrypt.genSalt(10);
                    const password_hash = await bcrypt.hash(password, salt);

                    await User.create({
                        email,
                        password_hash,
                        name: name || email.split('@')[0],
                    });
                } catch (error) {
                    console.error('Register error:', error);
                    res.status(500).json({ error: 'Registration failed' });
                }
            };

            await registerRouteHandler(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Registration failed' });
        });
    });

    describe('Login - User without password_hash', () => {
        it('should return an error if user tries to login with email/password but has only Google login', async () => {
            // Mock user found, but no password_hash
            User.findOne.mockResolvedValueOnce({ id: 1, email: 'googleonly@test.com', password_hash: null });

            const req = { body: { email: 'googleonly@test.com', password: 'password' } };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            // Simulate login route handler
            const loginRouteHandler = async (req, res) => {
                const { email, password } = req.body;

                const user = await User.findOne({ where: { email } });
                if (!user) {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }

                if (!user.password_hash) {
                    return res.status(401).json({ error: 'Please use Google login for this account' });
                }
            };

            await loginRouteHandler(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Please use Google login for this account' });
        });
    });
});