/**
 * Test Cases cho Auth Routes (auth.js)
 * 
 * Đây là bộ test cases mẫu để sử dụng với tính năng "Improve Existing Tests"
 * Người dùng có thể copy test cases này và paste vào công cụ để AI sinh thêm tests
 * 
 * Endpoints được test:
 * - POST /register - Đăng ký user mới
 * - POST /login - Đăng nhập
 * - POST /refresh - Làm mới access token
 * - GET /me - Lấy thông tin user hiện tại
 * - POST /logout - Đăng xuất
 */

describe('Auth Routes - POST /register', () => {
    // Test Case 1: Đăng ký thành công
    it('should register a new user with valid email and password', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'newuser@example.com',
                password: 'password123',
                name: 'New User'
            });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe('newuser@example.com');
        expect(response.body.data.accessToken).toBeDefined();
        expect(response.body.data.refreshToken).toBeDefined();
    });

    // Test Case 2: Thiếu email
    it('should return 400 if email is missing', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({ password: 'password123' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Email and password are required');
    });

    // Test Case 3: Thiếu password
    it('should return 400 if password is missing', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({ email: 'test@example.com' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Email and password are required');
    });

    // Test Case 4: Password quá ngắn
    it('should return 400 if password is less than 6 characters', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'test@example.com',
                password: '12345' // chỉ 5 ký tự
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Password must be at least 6 characters');
    });

    // Test Case 5: Email đã tồn tại
    it('should return 409 if email already registered', async () => {
        // Giả sử user với email này đã tồn tại trong database
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'existing@example.com',
                password: 'password123'
            });

        expect(response.status).toBe(409);
        expect(response.body.error).toBe('Email already registered');
    });
});

describe('Auth Routes - POST /login', () => {
    // Test Case 1: Đăng nhập thành công
    it('should login successfully with correct credentials', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'correctpassword'
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user).toBeDefined();
        expect(response.body.data.accessToken).toBeDefined();
    });

    // Test Case 2: Sai password
    it('should return 401 with incorrect password', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'wrongpassword'
            });

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Invalid credentials');
    });

    // Test Case 3: Email không tồn tại
    it('should return 401 if user does not exist', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'nonexistent@example.com',
                password: 'password123'
            });

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Invalid credentials');
    });

    // Test Case 4: User chỉ có Google login (không có password)
    it('should return 401 for Google-only user trying password login', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'googleuser@gmail.com',
                password: 'anypassword'
            });

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Please use Google login for this account');
    });
});

describe('Auth Routes - POST /refresh', () => {
    // Test Case 1: Refresh token thành công
    it('should return new access token with valid refresh token', async () => {
        const response = await request(app)
            .post('/api/auth/refresh')
            .send({ refreshToken: 'valid_refresh_token' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.accessToken).toBeDefined();
    });

    // Test Case 2: Thiếu refresh token
    it('should return 400 if refresh token is missing', async () => {
        const response = await request(app)
            .post('/api/auth/refresh')
            .send({});

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Refresh token required');
    });

    // Test Case 3: Refresh token không hợp lệ
    it('should return 403 with invalid refresh token', async () => {
        const response = await request(app)
            .post('/api/auth/refresh')
            .send({ refreshToken: 'invalid_token' });

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Invalid refresh token');
    });
});

describe('Auth Routes - GET /me', () => {
    // Test Case 1: Lấy profile thành công
    it('should return current user profile with valid token', async () => {
        const response = await request(app)
            .get('/api/auth/me')
            .set('Authorization', 'Bearer valid_access_token');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBeDefined();
        expect(response.body.data.email).toBeDefined();
        expect(response.body.data.hasGeminiKey).toBeDefined();
        expect(response.body.data.hasDeepseekKey).toBeDefined();
    });

    // Test Case 2: Không có token
    it('should return 401 if no authorization header', async () => {
        const response = await request(app)
            .get('/api/auth/me');

        expect(response.status).toBe(401);
    });

    // Test Case 3: Token không hợp lệ
    it('should return 401 with invalid token', async () => {
        const response = await request(app)
            .get('/api/auth/me')
            .set('Authorization', 'Bearer invalid_token');

        expect(response.status).toBe(401);
    });
});

describe('Auth Routes - POST /logout', () => {
    // Test Case 1: Logout thành công
    it('should return success message on logout', async () => {
        const response = await request(app)
            .post('/api/auth/logout');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Logged out successfully');
    });
});

/**
 * COVERAGE GAPS - Phần chưa được test (để AI bổ sung):
 * 
 * 1. Edge Cases:
 *    - Email với format không hợp lệ (missing @, special chars)
 *    - Password với unicode characters
 *    - Concurrent registration attempts with same email
 * 
 * 2. Error Handling:
 *    - Database connection failure
 *    - Token generation failure
 *    - Password hashing failure
 * 
 * 3. Google OAuth:
 *    - Google callback with valid profile
 *    - Google callback without email in profile
 *    - Linking Google account to existing email
 * 
 * 4. Security:
 *    - SQL injection attempts in email/password
 *    - Token expiration handling
 *    - Rate limiting for login attempts
 */
