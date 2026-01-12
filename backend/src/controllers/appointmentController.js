import { Appointment, Conversation } from '../models/index.js';
import { sendSuccess, sendCreated } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

/**
 * Appointment Controller
 * Handles all appointment-related API endpoints
 */

/**
 * Create a new appointment
 * POST /api/v1/appointments
 * 
 * @route POST /api/v1/appointments
 * @param {string} req.body.sessionId - Session identifier
 * @param {string} req.body.petOwnerName - Pet owner's name
 * @param {string} req.body.petName - Pet's name
 * @param {string} req.body.phoneNumber - Contact phone number
 * @param {string} req.body.preferredDate - Preferred appointment date (ISO format)
 * @param {string} req.body.preferredTime - Preferred time slot (HH:MM)
 * @param {string} [req.body.notes] - Optional notes
 * @returns {Object} Created appointment details
 */
export const createAppointment = asyncHandler(async (req, res) => {
    const {
        sessionId,
        petOwnerName,
        petName,
        phoneNumber,
        preferredDate,
        preferredTime,
        notes,
    } = req.body;

    logger.info(`Creating appointment for session: ${sessionId}`);

    // Verify the conversation exists
    const conversation = await Conversation.findBySessionId(sessionId);
    if (!conversation) {
        throw ApiError.notFound(`Conversation not found for session: ${sessionId}`);
    }

    // Check for conflicting appointments (optional - for demonstration)
    const hasConflict = await Appointment.hasConflict(
        new Date(preferredDate),
        preferredTime
    );

    if (hasConflict) {
        logger.warn(`Appointment conflict detected for ${preferredDate} at ${preferredTime}`);
        // Note: We still allow booking but could reject here if needed
    }

    // Create the appointment
    const appointment = new Appointment({
        sessionId,
        petOwnerName: petOwnerName.trim(),
        petName: petName.trim(),
        phoneNumber: phoneNumber.trim(),
        preferredDate: new Date(preferredDate),
        preferredTime,
        notes: notes?.trim() || null,
        status: 'pending',
    });

    await appointment.save();

    logger.info(`Appointment created: ${appointment.appointmentId}`);

    // Add a message to the conversation about the appointment
    await conversation.addMessage(
        'bot',
        `Great! I've scheduled your appointment request for ${appointment.formattedDate} at ${preferredTime}. ` +
        `Your appointment reference number is ${appointment.appointmentId}. ` +
        `We'll contact you at ${phoneNumber} to confirm the appointment.`
    );

    sendCreated(res, {
        appointment: {
            appointmentId: appointment.appointmentId,
            sessionId: appointment.sessionId,
            petOwnerName: appointment.petOwnerName,
            petName: appointment.petName,
            phoneNumber: appointment.phoneNumber,
            preferredDate: appointment.preferredDate,
            preferredTime: appointment.preferredTime,
            formattedDateTime: appointment.appointmentDateTime,
            status: appointment.status,
            notes: appointment.notes,
            createdAt: appointment.createdAt,
        },
        message: 'Appointment created successfully',
        hasConflict, // Inform if there might be scheduling conflicts
    });
});

/**
 * Get appointments by session ID
 * GET /api/v1/appointments/:sessionId
 * 
 * @route GET /api/v1/appointments/:sessionId
 * @param {string} req.params.sessionId - Session identifier
 * @param {string} [req.query.status] - Filter by status
 * @param {number} [req.query.limit=10] - Maximum appointments to return
 * @returns {Object} Array of appointments
 */
export const getAppointments = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { status, limit = 10 } = req.query;

    logger.info(`Fetching appointments for session: ${sessionId}`);

    // Verify the conversation exists
    const conversation = await Conversation.findBySessionId(sessionId);
    if (!conversation) {
        throw ApiError.notFound(`Conversation not found for session: ${sessionId}`);
    }

    // Find appointments for the session
    const appointments = await Appointment.findBySessionId(sessionId, {
        status,
        limit: parseInt(limit),
    });

    sendSuccess(res, {
        sessionId,
        appointments: appointments.map((apt) => ({
            appointmentId: apt.appointmentId,
            petOwnerName: apt.petOwnerName,
            petName: apt.petName,
            phoneNumber: apt.phoneNumber,
            preferredDate: apt.preferredDate,
            preferredTime: apt.preferredTime,
            formattedDateTime: apt.appointmentDateTime,
            status: apt.status,
            notes: apt.notes,
            isUpcoming: apt.isUpcoming,
            createdAt: apt.createdAt,
            confirmedAt: apt.confirmedAt,
            cancelledAt: apt.cancelledAt,
        })),
        total: appointments.length,
    });
});

/**
 * Get appointment by appointment ID
 * GET /api/v1/appointments/detail/:appointmentId
 * 
 * @route GET /api/v1/appointments/detail/:appointmentId
 * @param {string} req.params.appointmentId - Appointment identifier
 * @returns {Object} Appointment details
 */
export const getAppointmentById = asyncHandler(async (req, res) => {
    const { appointmentId } = req.params;

    logger.info(`Fetching appointment: ${appointmentId}`);

    const appointment = await Appointment.findByAppointmentId(appointmentId);

    if (!appointment) {
        throw ApiError.notFound(`Appointment not found: ${appointmentId}`);
    }

    sendSuccess(res, {
        appointment: {
            appointmentId: appointment.appointmentId,
            sessionId: appointment.sessionId,
            petOwnerName: appointment.petOwnerName,
            petName: appointment.petName,
            phoneNumber: appointment.phoneNumber,
            preferredDate: appointment.preferredDate,
            preferredTime: appointment.preferredTime,
            formattedDateTime: appointment.appointmentDateTime,
            status: appointment.status,
            notes: appointment.notes,
            cancellationReason: appointment.cancellationReason,
            isUpcoming: appointment.isUpcoming,
            createdAt: appointment.createdAt,
            updatedAt: appointment.updatedAt,
            confirmedAt: appointment.confirmedAt,
            cancelledAt: appointment.cancelledAt,
        },
    });
});

/**
 * Update appointment status
 * PATCH /api/v1/appointments/:appointmentId/status
 * 
 * @route PATCH /api/v1/appointments/:appointmentId/status
 * @param {string} req.params.appointmentId - Appointment identifier
 * @param {string} req.body.status - New status ('confirmed' or 'cancelled')
 * @param {string} [req.body.reason] - Reason for cancellation
 * @returns {Object} Updated appointment details
 */
export const updateAppointmentStatus = asyncHandler(async (req, res) => {
    const { appointmentId } = req.params;
    const { status, reason } = req.body;

    logger.info(`Updating appointment status: ${appointmentId} -> ${status}`);

    const appointment = await Appointment.findByAppointmentId(appointmentId);

    if (!appointment) {
        throw ApiError.notFound(`Appointment not found: ${appointmentId}`);
    }

    // Update based on requested status
    if (status === 'confirmed') {
        await appointment.confirm();
        logger.info(`Appointment confirmed: ${appointmentId}`);
    } else if (status === 'cancelled') {
        await appointment.cancel(reason);
        logger.info(`Appointment cancelled: ${appointmentId}`);
    }

    sendSuccess(res, {
        appointment: {
            appointmentId: appointment.appointmentId,
            status: appointment.status,
            confirmedAt: appointment.confirmedAt,
            cancelledAt: appointment.cancelledAt,
            cancellationReason: appointment.cancellationReason,
        },
        message: `Appointment ${status} successfully`,
    });
});

/**
 * Reschedule an appointment
 * PATCH /api/v1/appointments/:appointmentId/reschedule
 * 
 * @route PATCH /api/v1/appointments/:appointmentId/reschedule
 * @param {string} req.params.appointmentId - Appointment identifier
 * @param {string} req.body.preferredDate - New preferred date
 * @param {string} req.body.preferredTime - New preferred time
 * @returns {Object} Updated appointment details
 */
export const rescheduleAppointment = asyncHandler(async (req, res) => {
    const { appointmentId } = req.params;
    const { preferredDate, preferredTime } = req.body;

    logger.info(`Rescheduling appointment: ${appointmentId}`);

    const appointment = await Appointment.findByAppointmentId(appointmentId);

    if (!appointment) {
        throw ApiError.notFound(`Appointment not found: ${appointmentId}`);
    }

    // Check for conflicts at new time
    const hasConflict = await Appointment.hasConflict(
        new Date(preferredDate),
        preferredTime,
        appointmentId
    );

    if (hasConflict) {
        throw ApiError.badRequest(
            'The requested time slot is not available. Please choose a different time.',
            { conflictDetected: true }
        );
    }

    await appointment.reschedule(new Date(preferredDate), preferredTime);

    sendSuccess(res, {
        appointment: {
            appointmentId: appointment.appointmentId,
            preferredDate: appointment.preferredDate,
            preferredTime: appointment.preferredTime,
            formattedDateTime: appointment.appointmentDateTime,
            status: appointment.status,
        },
        message: 'Appointment rescheduled successfully',
    });
});

/**
 * Get upcoming appointments
 * GET /api/v1/appointments/upcoming
 * 
 * @route GET /api/v1/appointments/upcoming
 * @param {number} [req.query.daysAhead=7] - Days to look ahead
 * @param {number} [req.query.limit=50] - Maximum appointments to return
 * @returns {Object} Array of upcoming appointments
 */
export const getUpcomingAppointments = asyncHandler(async (req, res) => {
    const daysAhead = parseInt(req.query.daysAhead) || 7;
    const limit = parseInt(req.query.limit) || 50;

    logger.info(`Fetching upcoming appointments for next ${daysAhead} days`);

    const appointments = await Appointment.findUpcoming({
        daysAhead,
        limit,
    });

    sendSuccess(res, {
        appointments: appointments.map((apt) => ({
            appointmentId: apt.appointmentId,
            sessionId: apt.sessionId,
            petOwnerName: apt.petOwnerName,
            petName: apt.petName,
            phoneNumber: apt.phoneNumber,
            preferredDate: apt.preferredDate,
            preferredTime: apt.preferredTime,
            formattedDateTime: apt.appointmentDateTime,
            status: apt.status,
        })),
        total: appointments.length,
        daysAhead,
    });
});

/**
 * Get appointment statistics
 * GET /api/v1/appointments/stats
 * 
 * @route GET /api/v1/appointments/stats
 * @returns {Object} Appointment statistics
 */
export const getAppointmentStats = asyncHandler(async (req, res) => {
    const stats = await Appointment.getStats();

    sendSuccess(res, {
        stats,
        generatedAt: new Date().toISOString(),
    });
});

export default {
    createAppointment,
    getAppointments,
    getAppointmentById,
    updateAppointmentStatus,
    rescheduleAppointment,
    getUpcomingAppointments,
    getAppointmentStats,
};
