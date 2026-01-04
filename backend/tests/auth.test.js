/**
 * Working Test Cases for auth.js
 * File này có thể:
 * 1. Copy nội dung và paste vào trang Improve để AI sinh thêm tests
 * 2. Chạy được trên local với: npm test
 */

// ============================================
// PHẦN CODE TEST (Copy từ đây để paste vào web)
// ============================================

describe('Auth API Tests', () => {

    // Test 1: Đăng ký thành công
    it('POST /register - should register new user with valid data', async () => {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'newuser@example.com',
                password: 'password123',
                name: 'New User'
            })
        });
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.success).toBe(true);
        expect(data.data.accessToken).toBeDefined();
    });

    // Test 2: Đăng ký thiếu email
    it('POST /register - should return 400 when email is missing', async () => {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password: 'password123'
            })
        });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Email and password are required');
    });

    // Test 3: Đăng ký password ngắn
    it('POST /register - should return 400 when password less than 6 chars', async () => {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@example.com',
                password: '12345'
            })
        });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Password must be at least 6 characters');
    });

    // Test 4: Đăng nhập thành công
    it('POST /login - should login with correct credentials', async () => {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'existing@example.com',
                password: 'correctpassword'
            })
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.user).toBeDefined();
    });

    // Test 5: Đăng nhập sai password
    it('POST /login - should return 401 with wrong password', async () => {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'existing@example.com',
                password: 'wrongpassword'
            })
        });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Invalid credentials');
    });

    // Test 6: Refresh token
    it('POST /refresh - should return 400 when token missing', async () => {
        const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Refresh token required');
    });

    // Test 7: Logout
    it('POST /logout - should return success', async () => {
        const response = await fetch('/api/auth/logout', {
            method: 'POST'
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });
});

// ============================================
// COVERAGE GAPS (AI sẽ sinh thêm cho phần này):
// - Email format validation
// - Email already registered (409)
// - User not found (401)
// - Google OAuth flow
// - Token expiration
// - GET /me endpoint
// ============================================
