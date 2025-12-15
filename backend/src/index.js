import express from 'express';
import cors from 'cors';
import config, { validateConfig } from './config/index.js';
import generateRoutes from './routes/generate.js';
import historyRoutes from './routes/history.js';
import { initDatabase } from './models/index.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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
app.use('/api/generate', generateRoutes);
app.use('/api/history', historyRoutes);

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
    });
}

startServer();

export default app;
