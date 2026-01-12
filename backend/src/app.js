import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import { corsOptions } from './config/cors.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import apiV1Routes from './routes/v1/index.js';
import widgetRoutes from './routes/widgetRoutes.js';

const app = express();

// =============================================================================
// Security Middleware
// =============================================================================

// Set security HTTP headers
app.use(helmet());

// Enable CORS with configured options
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Limit each IP
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api', limiter);

// =============================================================================
// Body Parsing Middleware
// =============================================================================

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// =============================================================================
// Logging Middleware
// =============================================================================

// HTTP request logger (development only)
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Custom request logger
app.use(requestLogger);

// =============================================================================
// Health Check Endpoint
// =============================================================================

app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
    });
});

// =============================================================================
// API Routes
// =============================================================================

app.use('/api/v1', apiV1Routes);

// =============================================================================
// Widget Static Files
// =============================================================================

// Serve chatbot widget files (CORS-enabled for cross-origin embedding)
app.use('/widget', widgetRoutes);

// =============================================================================
// Demo Page (Static Files)
// =============================================================================

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve demo page from public folder
app.use(express.static(path.join(__dirname, '../public')));

// Serve demo page at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// =============================================================================
// Error Handling
// =============================================================================

// Handle 404 - Not Found
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
