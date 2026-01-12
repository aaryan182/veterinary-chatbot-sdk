import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

/**
 * MongoDB connection configuration
 */
const connectionOptions = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
};

/**
 * Connect to MongoDB database
 * @returns {Promise<void>}
 */
export const connectDatabase = async () => {
    try {
        const uri = process.env.MONGODB_URI;

        if (!uri) {
            throw new Error('MONGODB_URI environment variable is not defined');
        }

        await mongoose.connect(uri, connectionOptions);

        logger.info('📦 MongoDB connected successfully');

        // Handle connection events
        mongoose.connection.on('error', (error) => {
            logger.error('MongoDB connection error:', error);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('MongoDB reconnected successfully');
        });

    } catch (error) {
        logger.error('Failed to connect to MongoDB:', error.message);
        throw error;
    }
};

/**
 * Disconnect from MongoDB database
 * @returns {Promise<void>}
 */
export const disconnectDatabase = async () => {
    try {
        await mongoose.disconnect();
        logger.info('MongoDB disconnected');
    } catch (error) {
        logger.error('Error disconnecting from MongoDB:', error);
        throw error;
    }
};

/**
 * Get database connection status
 * @returns {string} Connection state description
 */
export const getDatabaseStatus = () => {
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
    };
    return states[mongoose.connection.readyState] || 'unknown';
};
