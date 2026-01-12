import { logger } from '../utils/logger.js';

/**
 * Request logging middleware
 * Logs incoming requests with timing information
 */
export const requestLogger = (req, res, next) => {
    const startTime = Date.now();

    // Log request
    logger.info(`→ ${req.method} ${req.originalUrl}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
    });

    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const level = res.statusCode >= 400 ? 'warn' : 'info';

        logger[level](`← ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });

    next();
};

export default requestLogger;
