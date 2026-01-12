import { v4 as uuidv4 } from 'uuid';
import { Conversation } from '../models/Conversation.js';
import { logger } from '../utils/logger.js';

/**
 * Session Initialization Middleware
 * Ensures a valid session exists before processing chat requests
 */

/**
 * Initialize or validate session for chat requests
 * Creates a new conversation if one doesn't exist for the session
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const initializeSession = async (req, res, next) => {
    try {
        let { sessionId } = req.body;
        const { context } = req.body;

        // Generate session ID if not provided
        if (!sessionId) {
            sessionId = `sess_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
            req.body.sessionId = sessionId;
            logger.debug(`Generated new session ID: ${sessionId}`);
        }

        // Try to find existing conversation or create new one
        const { conversation, created } = await Conversation.findOrCreate(sessionId, {
            userId: context?.userId || null,
            userName: context?.userName || null,
            petName: context?.petName || null,
            source: context?.source || 'widget',
        });

        if (created) {
            logger.info(`Created new conversation for session: ${sessionId}`);
        }

        // Attach conversation to request for use in controllers
        req.conversation = conversation;
        req.sessionId = sessionId;

        next();
    } catch (error) {
        logger.error('Session initialization error:', error);
        next(error);
    }
};

/**
 * Validate session exists middleware
 * For endpoints that require an existing session
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validateSessionExists = async (req, res, next) => {
    try {
        const sessionId = req.params.sessionId || req.body.sessionId;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_SESSION_ID',
                    message: 'Session ID is required',
                },
            });
        }

        const conversation = await Conversation.findBySessionId(sessionId);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'SESSION_NOT_FOUND',
                    message: `No conversation found for session: ${sessionId}`,
                },
            });
        }

        // Attach conversation to request
        req.conversation = conversation;
        req.sessionId = sessionId;

        next();
    } catch (error) {
        logger.error('Session validation error:', error);
        next(error);
    }
};

export default { initializeSession, validateSessionExists };
