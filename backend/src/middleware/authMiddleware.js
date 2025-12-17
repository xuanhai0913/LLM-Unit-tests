import jwt from 'jsonwebtoken';
import config from '../config/index.js';

/**
 * JWT Authentication Middleware
 * Verifies the access token and attaches user to request
 */
export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, config.jwt.secret, (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
            }
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = decoded;
        next();
    });
}

/**
 * Optional Authentication Middleware
 * Parses token if present but doesn't require it
 */
export function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    jwt.verify(token, config.jwt.secret, (err, decoded) => {
        if (err) {
            req.user = null;
        } else {
            req.user = decoded;
        }
        next();
    });
}

/**
 * Generate Access Token (short-lived)
 */
export function generateAccessToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            name: user.name
        },
        config.jwt.secret,
        { expiresIn: config.jwt.accessExpiresIn || '15m' }
    );
}

/**
 * Generate Refresh Token (long-lived)
 */
export function generateRefreshToken(user) {
    return jwt.sign(
        { id: user.id },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshExpiresIn || '7d' }
    );
}

export default { authenticateToken, optionalAuth, generateAccessToken, generateRefreshToken };
