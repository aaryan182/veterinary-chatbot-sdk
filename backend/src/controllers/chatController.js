import { Conversation, Appointment } from '../models/index.js';
import { geminiService } from '../services/geminiService.js';
import { appointmentFlowService, formatDateForDisplay, formatTimeForDisplay } from '../services/appointmentFlowService.js';
import { sendSuccess, sendCreated } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

/**
 * Chat Controller
 * Handles all chat-related API endpoints with intelligent appointment booking flow
 */

// =============================================================================
// Constants
// =============================================================================

/**
 * Appointment-related keywords for intent detection
 */
const APPOINTMENT_KEYWORDS = [
    'appointment', 'book', 'schedule', 'visit', 'see the vet',
    'checkup', 'check-up', 'check up', 'consultation',
    'bring my pet', 'bring my dog', 'bring my cat',
    'available times', 'available slots', 'when can i',
    'need to see', 'want to see', 'make an appointment',
    'book a visit', 'schedule a visit', 'veterinary visit',
];

/**
 * Booking state storage (in production, use Redis or session store)
 * Maps sessionId -> booking state
 */
const bookingStates = new Map();

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Detect if the user's message indicates appointment intent
 * @param {string} message - User's message
 * @returns {boolean} True if appointment intent detected
 */
const detectAppointmentIntent = (message) => {
    const lowerMessage = message.toLowerCase();
    return APPOINTMENT_KEYWORDS.some((keyword) => lowerMessage.includes(keyword));
};

/**
 * Build context string for AI from conversation and pet info
 * @param {Object} conversation - Conversation document
 * @returns {Object} Context object
 */
const buildAIContext = (conversation) => {
    return {
        userName: conversation.userName || null,
        petName: conversation.petName || null,
        userId: conversation.userId || null,
        source: conversation.source || null,
    };
};

/**
 * Get or create booking state for a session
 * @param {string} sessionId - Session identifier
 * @returns {Object|null} Booking state or null
 */
const getBookingState = (sessionId) => {
    return bookingStates.get(sessionId) || null;
};

/**
 * Set booking state for a session
 * @param {string} sessionId - Session identifier
 * @param {Object} state - Booking state
 */
const setBookingState = (sessionId, state) => {
    if (state && state.isActive) {
        bookingStates.set(sessionId, state);
    } else {
        bookingStates.delete(sessionId);
    }
};

/**
 * Create an appointment from collected fields
 * @param {string} sessionId - Session identifier
 * @param {Object} fields - Collected appointment fields
 * @returns {Promise<Object>} Created appointment
 */
const createAppointmentFromFields = async (sessionId, fields) => {
    const appointmentData = {
        sessionId,
        petOwnerName: fields.petOwnerName,
        petName: fields.petName,
        phoneNumber: fields.phoneNumber,
        preferredDate: new Date(fields.preferredDate),
        preferredTime: fields.preferredTime,
        status: 'pending',
        notes: `Booked via chat`,
    };

    const appointment = new Appointment(appointmentData);
    await appointment.save();

    logger.info(`Appointment created: ${appointment.appointmentId} for session ${sessionId}`);

    return appointment;
};

// =============================================================================
// Controller Methods
// =============================================================================

/**
 * Send a message and get AI response
 * POST /api/v1/chat/message
 * 
 * Handles both normal chat and appointment booking flow
 * 
 * @route POST /api/v1/chat/message
 * @param {Object} req.body.sessionId - Session identifier
 * @param {Object} req.body.message - User's message
 * @param {Object} [req.body.context] - Optional context (userId, userName, petName, source)
 * @returns {Object} AI response with appointment detection flag
 */
export const sendMessage = asyncHandler(async (req, res) => {
    const { message, context } = req.body;
    const { conversation, sessionId } = req;

    logger.info(`Processing message for session: ${sessionId}`);

    // Update conversation context if provided
    if (context) {
        if (context.userName && !conversation.userName) {
            conversation.userName = context.userName;
        }
        if (context.petName && !conversation.petName) {
            conversation.petName = context.petName;
        }
        if (context.userId && !conversation.userId) {
            conversation.userId = context.userId;
        }
        if (context.source && !conversation.source) {
            conversation.source = context.source;
        }
    }

    // Add user message to conversation
    await conversation.addMessage('user', message);

    // Get recent conversation history
    const recentMessages = conversation.getMessages(10);

    // Check if we're in appointment booking mode
    let bookingState = getBookingState(sessionId);
    let aiReply;
    let appointmentDetected = false;
    let appointmentCreated = null;
    let bookingInProgress = false;

    // ==========================================================================
    // Handle Appointment Booking Flow
    // ==========================================================================

    if (bookingState && bookingState.isActive) {
        // We're in booking mode, process through appointment flow
        bookingInProgress = true;

        try {
            const result = await appointmentFlowService.processMessage(
                message,
                bookingState,
                recentMessages
            );

            // Update booking state
            setBookingState(sessionId, result.state);
            bookingState = result.state;

            // Handle different actions
            switch (result.action) {
                case 'confirmed':
                    // User confirmed, create the appointment
                    try {
                        const appointment = await createAppointmentFromFields(
                            sessionId,
                            result.state.collectedFields
                        );

                        appointmentCreated = {
                            appointmentId: appointment.appointmentId,
                            preferredDate: appointment.preferredDate,
                            preferredTime: appointment.preferredTime,
                            petName: appointment.petName,
                            phoneNumber: appointment.phoneNumber,
                        };

                        aiReply = appointmentFlowService.generateSuccessMessage(appointment);

                        // Clear booking state
                        setBookingState(sessionId, null);
                    } catch (createError) {
                        logger.error('Failed to create appointment:', createError);
                        aiReply = "I'm sorry, there was an issue creating your appointment. " +
                            "Please try again or contact our clinic directly.";
                        bookingState.isConfirming = false;
                        setBookingState(sessionId, bookingState);
                    }
                    break;

                case 'cancelled':
                case 'restarted':
                    aiReply = result.response;
                    if (result.action === 'cancelled') {
                        setBookingState(sessionId, null);
                        bookingInProgress = false;
                    }
                    break;

                case 'confirming':
                case 'collecting':
                case 'edit_requested':
                default:
                    aiReply = result.response;
                    break;
            }

        } catch (flowError) {
            logger.error('Appointment flow error:', flowError);
            aiReply = "I encountered an issue with the booking process. " +
                "Would you like to start over? Just say 'restart' or 'cancel'.";
        }

    } else {
        // ==========================================================================
        // Handle Normal Chat Flow
        // ==========================================================================

        // Detect appointment intent
        const intentDetected = detectAppointmentIntent(message);

        // Also check with AI if available
        let aiIntentDetected = false;
        if (geminiService.isAvailable()) {
            aiIntentDetected = await geminiService.detectAppointmentIntent(message);
        }

        appointmentDetected = intentDetected || aiIntentDetected;

        // If appointment intent detected, start booking flow
        if (appointmentDetected) {
            logger.info(`Appointment intent detected for session: ${sessionId}`);

            // Extract any details from the initial message
            const extracted = await appointmentFlowService.analyzeMessage(
                message,
                recentMessages,
                {}
            );

            // Pre-populate with context from conversation
            const initialData = {};
            if (conversation.userName) {
                initialData.petOwnerName = conversation.userName;
            }
            if (conversation.petName) {
                initialData.petName = conversation.petName;
            }

            // Merge extracted data
            Object.keys(extracted).forEach((key) => {
                if (extracted[key] && !['wantsToCancel', 'wantsToRestart', 'confirmation'].includes(key)) {
                    initialData[key] = extracted[key];
                }
            });

            // Create booking state
            bookingState = appointmentFlowService.createBookingState(initialData);

            // Get the next field to ask for
            const nextField = appointmentFlowService.getNextField(initialData);

            if (appointmentFlowService.isComplete(initialData)) {
                // All fields already provided, ask for confirmation
                bookingState.isConfirming = true;
                aiReply = appointmentFlowService.generateConfirmationMessage(initialData);
            } else if (nextField) {
                // Acknowledge and ask for next field
                const hasData = Object.keys(initialData).length > 0;
                if (hasData) {
                    aiReply = "I'd be happy to help you book an appointment! " +
                        "I already have some of your information. " +
                        nextField.prompt;
                } else {
                    aiReply = "I'd be happy to help you book an appointment! 🐾\n\n" +
                        "I'll need a few details from you. " + nextField.prompt;
                }
            }

            // Save booking state
            setBookingState(sessionId, bookingState);
            bookingInProgress = true;

        } else {
            // Regular chat - generate AI response
            try {
                // Initialize Gemini service if not already done
                if (!geminiService.isAvailable()) {
                    geminiService.initialize();
                }

                if (geminiService.isAvailable()) {
                    const aiContext = buildAIContext(conversation);

                    aiReply = await geminiService.generateResponse(
                        message,
                        recentMessages,
                        {
                            name: aiContext.petName,
                            species: null,
                            breed: null,
                            age: null,
                            weight: null,
                        }
                    );
                } else {
                    // Fallback response when AI is not available
                    aiReply = 'I\'m here to help with your pet health questions. However, our AI service is ' +
                        'temporarily unavailable. Please try again shortly or contact our support team.';

                    logger.warn('AI service unavailable, using fallback response');
                }
            } catch (error) {
                logger.error('AI service error:', error);
                aiReply = 'I apologize, but I\'m having trouble processing your request right now. ' +
                    'Please try again in a moment. If you need immediate assistance, ' +
                    'please contact our veterinary clinic directly.';
            }
        }
    }

    // Add bot response to conversation
    await conversation.addMessage('bot', aiReply);

    // Build response object
    const responseData = {
        reply: aiReply,
        sessionId,
        appointmentDetected,
        bookingInProgress,
        messageCount: conversation.messages.length,
    };

    // Include appointment info if created
    if (appointmentCreated) {
        responseData.appointment = appointmentCreated;
    }

    // Include booking progress if in booking mode
    if (bookingState && bookingState.isActive) {
        const missingFields = appointmentFlowService.getMissingFields(bookingState.collectedFields);
        responseData.bookingState = {
            collectedFields: Object.keys(bookingState.collectedFields).filter(
                (k) => bookingState.collectedFields[k]
            ),
            missingFields,
            isConfirming: bookingState.isConfirming || false,
            progress: Math.round(
                ((5 - missingFields.length) / 5) * 100
            ),
        };
    }

    // Return response
    sendSuccess(res, responseData);
});

/**
 * Get conversation history
 * GET /api/v1/chat/history/:sessionId
 * 
 * @route GET /api/v1/chat/history/:sessionId
 * @param {string} req.params.sessionId - Session identifier
 * @param {number} [req.query.limit=50] - Maximum messages to return
 * @param {number} [req.query.skip=0] - Messages to skip
 * @returns {Object} Conversation history
 */
export const getHistory = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    logger.info(`Fetching history for session: ${sessionId}`);

    // Find conversation
    const conversation = await Conversation.findBySessionId(sessionId);

    if (!conversation) {
        throw ApiError.notFound(`Conversation not found for session: ${sessionId}`);
    }

    // Get messages with pagination
    const messages = conversation.getMessages(limit, skip);

    // Get booking state if any
    const bookingState = getBookingState(sessionId);

    sendSuccess(res, {
        sessionId,
        messages: messages.map((msg) => ({
            id: msg._id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
        })),
        totalMessages: conversation.messages.length,
        hasMore: skip + limit < conversation.messages.length,
        conversation: {
            userName: conversation.userName,
            petName: conversation.petName,
            isActive: conversation.isActive,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
        },
        bookingInProgress: bookingState ? bookingState.isActive : false,
    });
});

/**
 * Close a conversation
 * POST /api/v1/chat/close/:sessionId
 * 
 * @route POST /api/v1/chat/close/:sessionId
 * @param {string} req.params.sessionId - Session identifier
 * @returns {Object} Closed conversation status
 */
export const closeConversation = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    logger.info(`Closing conversation for session: ${sessionId}`);

    const conversation = await Conversation.findBySessionId(sessionId);

    if (!conversation) {
        throw ApiError.notFound(`Conversation not found for session: ${sessionId}`);
    }

    // Clear booking state
    setBookingState(sessionId, null);

    await conversation.close();

    sendSuccess(res, {
        sessionId,
        status: 'closed',
        message: 'Conversation closed successfully',
    });
});

/**
 * Cancel booking for a session
 * POST /api/v1/chat/cancel-booking/:sessionId
 * 
 * @route POST /api/v1/chat/cancel-booking/:sessionId
 * @param {string} req.params.sessionId - Session identifier
 * @returns {Object} Cancellation status
 */
export const cancelBooking = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    logger.info(`Cancelling booking for session: ${sessionId}`);

    const bookingState = getBookingState(sessionId);

    if (!bookingState || !bookingState.isActive) {
        throw ApiError.badRequest('No active booking found for this session');
    }

    // Clear booking state
    setBookingState(sessionId, null);

    sendSuccess(res, {
        sessionId,
        status: 'cancelled',
        message: 'Booking cancelled successfully',
    });
});

/**
 * Get booking state for a session
 * GET /api/v1/chat/booking-state/:sessionId
 * 
 * @route GET /api/v1/chat/booking-state/:sessionId
 * @param {string} req.params.sessionId - Session identifier
 * @returns {Object} Current booking state
 */
export const getBookingStateEndpoint = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    const bookingState = getBookingState(sessionId);

    if (!bookingState) {
        sendSuccess(res, {
            sessionId,
            bookingInProgress: false,
        });
        return;
    }

    const missingFields = appointmentFlowService.getMissingFields(bookingState.collectedFields);

    sendSuccess(res, {
        sessionId,
        bookingInProgress: bookingState.isActive,
        collectedFields: bookingState.collectedFields,
        missingFields,
        isConfirming: bookingState.isConfirming || false,
        progress: Math.round(((5 - missingFields.length) / 5) * 100),
    });
});

/**
 * Get conversation statistics
 * GET /api/v1/chat/stats
 * 
 * @route GET /api/v1/chat/stats
 * @returns {Object} Conversation statistics
 */
export const getStats = asyncHandler(async (req, res) => {
    const stats = await Conversation.getStats();
    const activeStats = await Conversation.getStats({ isActive: true });

    sendSuccess(res, {
        total: stats,
        active: activeStats,
        activeBookings: bookingStates.size,
        generatedAt: new Date().toISOString(),
    });
});

export default {
    sendMessage,
    getHistory,
    closeConversation,
    cancelBooking,
    getBookingStateEndpoint,
    getStats,
};
