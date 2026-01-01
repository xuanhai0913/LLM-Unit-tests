import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import config, { validateConfig } from './config/index.js';
import generateRoutes from './routes/generate.js';
import historyRoutes from './routes/history.js';
import authRoutes from './routes/auth.js';
import settingsRoutes from './routes/settings.js';
import keysRoutes from './routes/keys.js';
import testRoutes from './routes/test.js';
import improveRoutes from './routes/improve.js';
import scanRoutes from './routes/scan.js';
import analyzeRoutes from './routes/analyze.js';
import { initDatabase } from './models/index.js';

const app = express();

// Middleware
app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session middleware (for OAuth)
app.use(session({
    secret: config.jwt.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: config.nodeEnv === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/keys', keysRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/test', testRoutes);
app.use('/api/improve', improveRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/analyze', analyzeRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        ...(config.nodeEnv === 'development' && { stack: err.stack }),
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

// Start server
async function startServer() {
    validateConfig();

    try {
        await initDatabase();
        console.log('✅ Database initialized');
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
    }

    app.listen(config.port, () => {
        console.log(`🚀 Server running on http://localhost:${config.port}`);
        console.log(`📝 Environment: ${config.nodeEnv}`);
        console.log(`🔗 Frontend URL: ${config.frontendUrl}`);
    });
}

startServer();

export default app;

