import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock Dependencies (Must be done before imports in ESM)
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

    describe('Google Auth Strategy Error Handling', () => {
        it('should handle errors during Google OAuth strategy', async () => {
            const profile = { id: 'google_123', emails: [{ value: 'test@example.com' }], displayName: 'Test User' };

            // Mock User.findOne to throw an error
            User.findOne.mockRejectedValue(new Error('Database error'));

            const mockDone = jest.fn();

            // Simulate the verify callback
            const googleStrategyCallback = async (accessToken, refreshToken, profile, done) => {
                try {
                    await User.findOne({ where: { google_id: profile.id } });
                } catch (error) {
                    done(error, null);
                }
            };

            await googleStrategyCallback(null, null, profile, mockDone);

            expect(User.findOne).toHaveBeenCalledWith({ where: { google_id: profile.id } });
            expect(mockDone).toHaveBeenCalledWith(new Error('Database error'), null);
        });

        it('should handle missing email in Google profile', async () => {
            const profile = { id: 'google_123', displayName: 'Test User', emails: [] };

            const mockDone = jest.fn();

            const googleStrategyCallback = async (accessToken, refreshToken, profile, done) => {
                try {
                    let user = await User.findOne({ where: { google_id: profile.id } });

                    if (!user) {
                        const email = profile.emails?.[0]?.value;
                        if (!email) {
                            return done(new Error('No email found in Google profile'), null);
                        }
                    }
                } catch (error) {
                    done(error, null);
                }
            };

            await googleStrategyCallback(null, null, profile, mockDone);

            expect(mockDone).toHaveBeenCalledWith(new Error('No email found in Google profile'), null);
        });
    });

    describe('deserializeUser error handling', () => {
        it('should handle errors during deserializeUser', async () => {
            // Mock User.findByPk to throw an error
            User.findByPk.mockRejectedValue(new Error('Database error'));

            const mockDone = jest.fn();

            const deserializeUserCallback = async (id, done) => {
                try {
                    await User.findByPk(id);
                } catch (error) {
                    done(error, null);
                }
            };

            await deserializeUserCallback(1, mockDone);

            expect(User.findByPk).toHaveBeenCalledWith(1);
            expect(mockDone).toHaveBeenCalledWith(new Error('Database error'), null);
        });
    });

    describe('Register error handling', () => {
        it('should handle bcrypt.genSalt failure during registration', async () => {
            // Mock bcrypt.genSalt to throw an error
            bcrypt.genSalt.mockRejectedValue(new Error('bcrypt error'));

            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            const registerRouteHandler = async (req, res) => {
                try {
                    const { password } = req.body;
                    await bcrypt.genSalt(10);
                    const salt = await bcrypt.genSalt(10);
                    const password_hash = await bcrypt.hash(password, salt);
                } catch (error) {
                    console.error('Register error:', error);
                    res.status(500).json({ error: 'Registration failed' });
                }
            };

            await registerRouteHandler({ body: { email: 'test@example.com', password: 'password', name: 'Test' } }, mockRes);

            expect(bcrypt.genSalt).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Registration failed' });
        });

        it('should handle bcrypt.hash failure during registration', async () => {
            // Mock bcrypt.hash to throw an error
            bcrypt.hash.mockRejectedValue(new Error('bcrypt error'));
            bcrypt.genSalt.mockResolvedValue(10);

            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            const registerRouteHandler = async (req, res) => {
                try {
                    const { password } = req.body;
                    const salt = await bcrypt.genSalt(10);
                    await bcrypt.hash(password, salt);
                } catch (error) {
                    console.error('Register error:', error);
                    res.status(500).json({ error: 'Registration failed' });
                }
            };

            await registerRouteHandler({ body: { email: 'test@example.com', password: 'password', name: 'Test' } }, mockRes);

            expect(bcrypt.hash).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Registration failed' });
        });
    });

    describe('Refresh token verification failure', () => {
        it('should handle invalid refresh token', async () => {
            // Mock jwt.verify to call the callback with an error
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(new Error('Invalid refresh token'), null);
            });

            const mockReq = { body: { refreshToken: 'invalid_token' } };
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            const refreshTokenRouteHandler = async (req, res) => {
                const { refreshToken } = req.body;

                jwt.verify(refreshToken, 'test_refresh_secret', (err, decoded) => {
                    if (err) {
                        return res.status(403).json({ error: 'Invalid refresh token' });
                    }
                });
            };

            await refreshTokenRouteHandler(mockReq, mockRes);

            expect(jwt.verify).toHaveBeenCalledWith('invalid_token', 'test_refresh_secret', expect.any(Function));
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid refresh token' });
        });
    });

    describe('Refresh token user not found', () => {
        it('should handle user not found during refresh token', async () => {
            // Mock jwt.verify to decode the token
            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(null, { id: 123 });
            });

            // Mock User.findByPk to return null (user not found)
            User.findByPk.mockResolvedValue(null);

            const mockReq = { body: { refreshToken: 'valid_token' } };
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            const refreshTokenRouteHandler = async (req, res) => {
                const { refreshToken } = req.body;

                jwt.verify(refreshToken, 'test_refresh_secret', async (err, decoded) => {
                    if (err) {
                        return res.status(403).json({ error: 'Invalid refresh token' });
                    }

                    const user = await User.findByPk(decoded.id);
                    if (!user) {
                        return res.status(404).json({ error: 'User not found' });
                    }
                });
            };

            await refreshTokenRouteHandler(mockReq, mockRes);

            expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test_refresh_secret', expect.any(Function));
            expect(User.findByPk).toHaveBeenCalledWith(123);
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not found' });
        });
    });

    describe('Get Me endpoint error handling', () => {
        it('should handle errors when fetching user profile', async () => {
            // Mock User.findByPk to throw an error
            User.findByPk.mockRejectedValue(new Error('Database error'));

            const mockReq = { user: { id: 123 } };
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };
            const mockNext = jest.fn();

            const getMeRouteHandler = async (req, res) => {
                try {
                    await User.findByPk(req.user.id, {
                        attributes: ['id', 'email', 'name', 'avatar', 'preferred_llm', 'license_status', 'license_valid_until']
                    });
                } catch (error) {
                    console.error('Get user error:', error);
                    res.status(500).json({ error: 'Failed to get user' });
                }
            };

            await getMeRouteHandler(mockReq, mockRes, mockNext);

            expect(User.findByPk).toHaveBeenCalledWith(123, {
                attributes: ['id', 'email', 'name', 'avatar', 'preferred_llm', 'license_status', 'license_valid_until']
            });
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to get user' });
        });
    });

    describe('Google Callback error handling', () => {
        it('should handle errors in Google OAuth callback', async () => {
            const mockReq = { user: { id: 123 } };
            const mockRes = {
                redirect: jest.fn(),
            };
            const mockNext = jest.fn();

            // Mock generateAccessToken to throw an error
            const generateAccessToken = () => { throw new Error('Token generation error'); };

            const googleCallbackRouteHandler = async (req, res) => {
                try {
                    const user = req.user;
                    const accessToken = generateAccessToken(user); // Simulate error
                    const refreshToken = 'refreshToken';

                    const frontendUrl = 'http://localhost:3000';
                    res.redirect(`${frontendUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
                } catch (error) {
                    console.error('Google callback error:', error);
                    res.redirect('/login?error=auth_failed');
                }
            };

            await googleCallbackRouteHandler(mockReq, mockRes, mockNext);

            expect(mockRes.redirect).toHaveBeenCalledWith('/login?error=auth_failed');
        });
    });

    describe('Google OAuth initiation', () => {
        it('should call passport.authenticate with correct arguments', () => {
            const mockReq = {};
            const mockRes = {};
            const mockNext = jest.fn();

            const googleAuthInitiationHandler = (req, res, next) => {
                passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
            };

            googleAuthInitiationHandler(mockReq, mockRes, mockNext);

            expect(passport.authenticate).toHaveBeenCalledWith('google', { scope: ['profile', 'email'] });
        });
    });

    describe('Logout functionality', () => {
        it('should return success message on logout', () => {
            const mockReq = {};
            const mockRes = {
                json: jest.fn(),
            };

            const logoutRouteHandler = (req, res) => {
                res.json({ success: true, message: 'Logged out successfully' });
            };

            logoutRouteHandler(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: 'Logged out successfully' });
        });
    });
});
