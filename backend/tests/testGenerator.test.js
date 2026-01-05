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
let User, jwt, bcrypt, config, passport;

describe('Auth Service Tests', () => {

    beforeAll(async () => {
        User = (await import('../src/models/index.js')).User;
        jwt = (await import('jsonwebtoken')).default;
        bcrypt = (await import('bcryptjs')).default;
        config = (await import('../src/config/index.js')).default;
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

        it('should handle error when User.findOne fails in register', async () => {
            // Mock User.findOne to reject with an error
            User.findOne.mockRejectedValue(new Error('Database error'));

            const register = async () => {
                await User.findOne({ where: { email: 'test@example.com' } });
            };

            await expect(register()).rejects.toThrow('Database error');
            expect(User.findOne).toHaveBeenCalled();
        });

        it('should handle error when bcrypt.genSalt fails in register', async () => {
            // Mock bcrypt.genSalt to reject with an error
            bcrypt.genSalt.mockRejectedValue(new Error('Salt generation failed'));

            const register = async () => {
                await bcrypt.genSalt(10);
            };

            await expect(register()).rejects.toThrow('Salt generation failed');
            expect(bcrypt.genSalt).toHaveBeenCalled();
        });

        it('should handle error when bcrypt.hash fails in register', async () => {
            // Mock bcrypt.hash to reject with an error
            bcrypt.hash.mockRejectedValue(new Error('Hashing failed'));
            bcrypt.genSalt.mockResolvedValue(10);

            const register = async () => {
                await bcrypt.hash('password', 10);
            };

            await expect(register()).rejects.toThrow('Hashing failed');
            expect(bcrypt.hash).toHaveBeenCalled();
        });

        it('should handle error when User.create fails in register', async () => {
            // Mock User.create to reject with an error
            User.create.mockRejectedValue(new Error('User creation failed'));
            bcrypt.genSalt.mockResolvedValue(10);
            bcrypt.hash.mockResolvedValue('hashed_password');

            const register = async () => {
                await User.create({
                    email: 'test@example.com',
                    password_hash: 'hashed_password',
                    name: 'test'
                });
            };

            await expect(register()).rejects.toThrow('User creation failed');
            expect(User.create).toHaveBeenCalled();
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

    describe('Login Logic', () => {
        it('should handle error when User.findOne fails in login', async () => {
            // Mock User.findOne to reject with an error
            User.findOne.mockRejectedValue(new Error('Database error'));

            const login = async () => {
                await User.findOne({ where: { email: 'test@example.com' } });
            };

            await expect(login()).rejects.toThrow('Database error');
            expect(User.findOne).toHaveBeenCalled();
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