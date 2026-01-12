import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 5000;

/**
 * Start the server and initialize database connection
 */
const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDatabase();

        // Start Express server
        app.listen(PORT, () => {
            logger.info(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
            logger.info(`📚 API Documentation: http://localhost:${PORT}/api/v1`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

startServer();
