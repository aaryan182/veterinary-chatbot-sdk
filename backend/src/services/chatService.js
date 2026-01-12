import { ChatSession } from '../models/ChatSession.js';
import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Chat Session Service
 * Handles CRUD operations for chat sessions
 */
class ChatService {
    /**
     * Create a new chat session
     * @param {object} sessionData - Session initialization data
     * @returns {Promise<object>} Created session
     */
    async createSession(sessionData = {}) {
        try {
            const session = new ChatSession({
                sessionId: sessionData.sessionId || uuidv4(),
                userId: sessionData.userId || null,
                petInfo: sessionData.petInfo || {},
                metadata: sessionData.metadata || {},
                messages: [],
            });

            await session.save();
            logger.info(`Created new chat session: ${session.sessionId}`);
            return session;
        } catch (error) {
            logger.error('Failed to create chat session:', error);
            throw ApiError.internal('Failed to create chat session');
        }
    }

    /**
     * Get a session by ID
     * @param {string} sessionId - Session ID
     * @returns {Promise<object>} Session document
     */
    async getSession(sessionId) {
        try {
            const session = await ChatSession.findOne({ sessionId });
            if (!session) {
                throw ApiError.notFound(`Session not found: ${sessionId}`);
            }
            return session;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            logger.error('Failed to get chat session:', error);
            throw ApiError.internal('Failed to retrieve chat session');
        }
    }

    /**
     * Add a message to a session
     * @param {string} sessionId - Session ID
     * @param {string} role - Message role (user/assistant)
     * @param {string} content - Message content
     * @returns {Promise<object>} Updated session
     */
    async addMessage(sessionId, role, content) {
        try {
            const session = await this.getSession(sessionId);

            session.messages.push({
                role,
                content,
                timestamp: new Date(),
            });

            await session.save();
            return session;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            logger.error('Failed to add message:', error);
            throw ApiError.internal('Failed to add message to session');
        }
    }

    /**
     * Update pet information for a session
     * @param {string} sessionId - Session ID
     * @param {object} petInfo - Pet information to update
     * @returns {Promise<object>} Updated session
     */
    async updatePetInfo(sessionId, petInfo) {
        try {
            const session = await ChatSession.findOneAndUpdate(
                { sessionId },
                { $set: { petInfo } },
                { new: true }
            );

            if (!session) {
                throw ApiError.notFound(`Session not found: ${sessionId}`);
            }

            return session;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            logger.error('Failed to update pet info:', error);
            throw ApiError.internal('Failed to update pet information');
        }
    }

    /**
     * Close a session
     * @param {string} sessionId - Session ID
     * @returns {Promise<object>} Updated session
     */
    async closeSession(sessionId) {
        try {
            const session = await ChatSession.findOneAndUpdate(
                { sessionId },
                { status: 'closed' },
                { new: true }
            );

            if (!session) {
                throw ApiError.notFound(`Session not found: ${sessionId}`);
            }

            logger.info(`Closed chat session: ${sessionId}`);
            return session;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            logger.error('Failed to close session:', error);
            throw ApiError.internal('Failed to close chat session');
        }
    }

    /**
     * Get conversation history for a session
     * @param {string} sessionId - Session ID
     * @param {number} limit - Maximum messages to return
     * @returns {Promise<Array>} Message history
     */
    async getConversationHistory(sessionId, limit = 50) {
        try {
            const session = await this.getSession(sessionId);
            return session.messages.slice(-limit);
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            logger.error('Failed to get conversation history:', error);
            throw ApiError.internal('Failed to retrieve conversation history');
        }
    }
}

export const chatService = new ChatService();
export default chatService;
