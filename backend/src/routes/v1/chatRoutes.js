import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { initializeSession, validateSessionExists } from '../../middleware/sessionMiddleware.js';
import {
    sendMessageValidation,
    getHistoryValidation,
} from '../../middleware/validators.js';
import {
    sendMessage,
    getHistory,
    closeConversation,
    cancelBooking,
    getBookingStateEndpoint,
    getStats,
} from '../../controllers/chatController.js';

const router = Router();

/**
 * @route   POST /api/v1/chat/message
 * @desc    Send a message and get AI response (handles appointment booking flow)
 * @access  Public
 * 
 * @body    {string} sessionId - Session identifier (optional, auto-generated if not provided)
 * @body    {string} message - User's message
 * @body    {Object} [context] - Optional context object
 * @body    {string} [context.userId] - User identifier
 * @body    {string} [context.userName] - User's name
 * @body    {string} [context.petName] - Pet's name
 * @body    {string} [context.source] - Source identifier
 * 
 * @returns {Object} { success, data: { reply, sessionId, appointmentDetected, bookingInProgress, bookingState? } }
 */
router.post(
    '/message',
    validate(sendMessageValidation),
    initializeSession,
    sendMessage
);

/**
 * @route   GET /api/v1/chat/history/:sessionId
 * @desc    Get conversation history for a session
 * @access  Public
 * 
 * @param   {string} sessionId - Session identifier
 * @query   {number} [limit=50] - Maximum messages to return
 * @query   {number} [skip=0] - Messages to skip (for pagination)
 * 
 * @returns {Object} { success, data: { sessionId, messages, totalMessages, hasMore } }
 */
router.get(
    '/history/:sessionId',
    validate(getHistoryValidation),
    getHistory
);

/**
 * @route   POST /api/v1/chat/close/:sessionId
 * @desc    Close a conversation session
 * @access  Public
 * 
 * @param   {string} sessionId - Session identifier
 * 
 * @returns {Object} { success, data: { sessionId, status } }
 */
router.post(
    '/close/:sessionId',
    validate(getHistoryValidation), // Reuse session validation
    closeConversation
);

/**
 * @route   POST /api/v1/chat/cancel-booking/:sessionId
 * @desc    Cancel an in-progress appointment booking
 * @access  Public
 * 
 * @param   {string} sessionId - Session identifier
 * 
 * @returns {Object} { success, data: { sessionId, status } }
 */
router.post(
    '/cancel-booking/:sessionId',
    validate(getHistoryValidation), // Reuse session validation
    cancelBooking
);

/**
 * @route   GET /api/v1/chat/booking-state/:sessionId
 * @desc    Get current booking state for a session
 * @access  Public
 * 
 * @param   {string} sessionId - Session identifier
 * 
 * @returns {Object} { success, data: { sessionId, bookingInProgress, collectedFields?, missingFields?, progress? } }
 */
router.get(
    '/booking-state/:sessionId',
    validate(getHistoryValidation), // Reuse session validation
    getBookingStateEndpoint
);

/**
 * @route   GET /api/v1/chat/stats
 * @desc    Get conversation statistics
 * @access  Public
 * 
 * @returns {Object} { success, data: { total, active, activeBookings } }
 */
router.get('/stats', getStats);

export default router;

