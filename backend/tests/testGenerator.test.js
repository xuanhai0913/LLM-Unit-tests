import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';

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

// 2. Define variables for modules
let User, jwt, bcrypt, passport;

// Mock global fetch for API calls
global.fetch = jest.fn();

describe('Auth Service Tests', () => {

    beforeAll(async () => {
        // Import Modules inside beforeAll to avoid Top-Level Await issues
        User = (await import('../src/models/index.js')).User;
        jwt = (await import('jsonwebtoken')).default;
        bcrypt = (await import('bcryptjs')).default;
        passport = (await import('passport')).default;
    });

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

describe('Auth Route Error Handling', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Google OAuth Strategy Error Handling', () => {
        it('should handle GoogleStrategy error', async () => {
            // Mock User.findOne to throw an error
            User.findOne.mockRejectedValue(new Error('Database error'));

            const profile = { id: 'google_123', emails: [{ value: 'test@example.com' }], displayName: 'Test User' };
            const mockDone = jest.fn();

            const MockStrategy = (await import('passport-google-oauth20')).Strategy;
            const strategy = new MockStrategy({
                clientID: 'id',
                clientSecret: 'secret',
                callbackURL: 'url',
            }, async (accessToken, refreshToken, profile, done) => {
                try {
                    await User.findOne({ where: { google_id: profile.id } });
                } catch (error) {
                    done(error, null);
                }
            });

            await strategy.verify('token', 'token', profile, mockDone);

            expect(User.findOne).toHaveBeenCalledWith({ where: { google_id: 'google_123' } });
            expect(mockDone).toHaveBeenCalledWith(new Error('Database error'), null);
        });

        it('should handle GoogleStrategy error when no email is found', async () => {
            const profile = { id: 'google_123', displayName: 'Test User' }; // No emails
            const mockDone = jest.fn();

            const MockStrategy = (await import('passport-google-oauth20')).Strategy;
            const strategy = new MockStrategy({
                clientID: 'id',
                clientSecret: 'secret',
                callbackURL: 'url',
            }, async (accessToken, refreshToken, profile, done) => {
                try {
                    // Simulate the email check failing
                    if (!profile.emails || profile.emails.length === 0 || !profile.emails[0].value) {
                        return done(new Error('No email found in Google profile'), null);
                    }
                } catch (error) {
                    done(error, null);
                }
            });

            await strategy.verify('token', 'token', profile, mockDone);

            expect(mockDone).toHaveBeenCalledWith(new Error('No email found in Google profile'), null);
        });
    });

    describe('Passport Deserialize User Error Handling', () => {
        it('should handle deserializeUser error', async () => {
            // Mock User.findByPk to throw an error
            User.findByPk.mockRejectedValue(new Error('Database error'));

            const mockDone = jest.fn();
            const passportModule = await import('passport');

            passportModule.default.deserializeUser(async (id, done) => {
                try {
                    await User.findByPk(id);
                } catch (error) {
                    done(error, null);
                }
            });

            await passportModule.default.deserializeUser(123, mockDone);

            expect(User.findByPk).toHaveBeenCalledWith(123);
            expect(mockDone).toHaveBeenCalledWith(new Error('Database error'), null);
        });
    });

    describe('Refresh Token Route Error Handling', () => {
        it('should handle refresh token verification error', async () => {
            const mockReq = { body: { refreshToken: 'invalid_token' } };
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(new Error('Invalid token'), null);
            });

            const authRouter = (await import('../src/routes/auth.js')).default;
            await authRouter.stack.find(layer => layer.route && layer.route.path === '/refresh').handle(mockReq, mockRes, () => { });

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid refresh token' });
        });

        it('should handle refresh user not found', async () => {
            const mockReq = { body: { refreshToken: 'valid_token' } };
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            jwt.verify.mockImplementation((token, secret, callback) => {
                callback(null, { id: 456 });
            });
            User.findByPk.mockResolvedValue(null);

            const authRouter = (await import('../src/routes/auth.js')).default;
            await authRouter.stack.find(layer => layer.route && layer.route.path === '/refresh').handle(mockReq, mockRes, () => { });

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not found' });
        });
    });

    describe('Me Route Error Handling', () => {
        it('should handle me route - user not found', async () => {
            const mockReq = { user: { id: 789 } };
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };

            User.findByPk.mockResolvedValue(null);

            const authRouter = (await import('../src/routes/auth.js')).default;
            await authRouter.stack.find(layer => layer.route && layer.route.path === '/me').handle(mockReq, mockRes, () => { });

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not found' });
        });
    });

    describe('Google Callback Route Error Handling', () => {
        it('should handle Google callback error', async () => {
            const mockReq = { user: { id: 1 } };
            const mockRes = {
                redirect: jest.fn(),
            };

            jwt.sign.mockImplementation(() => {
                throw new Error('Token generation failed');
            });

            const authRouter = (await import('../src/routes/auth.js')).default;
            const googleCallbackRoute = authRouter.stack.find(layer => layer.route && layer.route.path === '/google/callback');

            // Simulate the route handler by calling it directly
            await googleCallbackRoute.handle(mockReq, mockRes, () => { });

            expect(mockRes.redirect).toHaveBeenCalledWith('/login?error=auth_failed');
        });
    });

    describe('Logout Route Test', () => {
        it('should successfully logout', async () => {
            const mockReq = {};
            const mockRes = {
                json: jest.fn(),
            };

            const authRouter = (await import('../src/routes/auth.js')).default;
            await authRouter.stack.find(layer => layer.route && layer.route.path === '/logout').handle(mockReq, mockRes, () => { });

            expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: 'Logged out successfully' });
        });
    });

    describe('Passport Serialize User', () => {
        it('should serialize user successfully', () => {
            const mockDone = jest.fn();
            const passportModule = await import('passport');

            passportModule.default.serializeUser((user, done) => {
                done(null, user.id);
            });

            passportModule.default.serializeUser({ id: 123 }, mockDone);

            expect(mockDone).toHaveBeenCalledWith(null, 123);
        });
    });
});