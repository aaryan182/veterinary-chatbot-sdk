import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import {
    createAppointmentValidation,
    getAppointmentsValidation,
    getAppointmentByIdValidation,
    updateAppointmentStatusValidation,
} from '../../middleware/validators.js';
import {
    createAppointment,
    getAppointments,
    getAppointmentById,
    updateAppointmentStatus,
    rescheduleAppointment,
    getUpcomingAppointments,
    getAppointmentStats,
} from '../../controllers/appointmentController.js';
import { body, param, query } from 'express-validator';

const router = Router();

/**
 * @route   POST /api/v1/appointments
 * @desc    Create a new appointment
 * @access  Public
 * 
 * @body    {string} sessionId - Session identifier
 * @body    {string} petOwnerName - Pet owner's name
 * @body    {string} petName - Pet's name
 * @body    {string} phoneNumber - Contact phone number
 * @body    {string} preferredDate - Preferred date (ISO format)
 * @body    {string} preferredTime - Preferred time (HH:MM)
 * @body    {string} [notes] - Optional notes
 * 
 * @returns {Object} { success, data: { appointment, message } }
 */
router.post(
    '/',
    validate(createAppointmentValidation),
    createAppointment
);

/**
 * @route   GET /api/v1/appointments/upcoming
 * @desc    Get upcoming appointments
 * @access  Public
 * 
 * @query   {number} [daysAhead=7] - Days to look ahead
 * @query   {number} [limit=50] - Maximum appointments
 * 
 * @returns {Object} { success, data: { appointments, total } }
 */
router.get(
    '/upcoming',
    [
        query('daysAhead')
            .optional()
            .isInt({ min: 1, max: 90 })
            .withMessage('Days ahead must be between 1 and 90')
            .toInt(),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100')
            .toInt(),
    ],
    validate([]),
    getUpcomingAppointments
);

/**
 * @route   GET /api/v1/appointments/stats
 * @desc    Get appointment statistics
 * @access  Public
 * 
 * @returns {Object} { success, data: { stats } }
 */
router.get('/stats', getAppointmentStats);

/**
 * @route   GET /api/v1/appointments/detail/:appointmentId
 * @desc    Get appointment by ID
 * @access  Public
 * 
 * @param   {string} appointmentId - Appointment identifier
 * 
 * @returns {Object} { success, data: { appointment } }
 */
router.get(
    '/detail/:appointmentId',
    validate(getAppointmentByIdValidation),
    getAppointmentById
);

/**
 * @route   GET /api/v1/appointments/:sessionId
 * @desc    Get appointments for a session
 * @access  Public
 * 
 * @param   {string} sessionId - Session identifier
 * @query   {string} [status] - Filter by status
 * @query   {number} [limit=10] - Maximum appointments
 * 
 * @returns {Object} { success, data: { sessionId, appointments, total } }
 */
router.get(
    '/:sessionId',
    validate(getAppointmentsValidation),
    getAppointments
);

/**
 * @route   PATCH /api/v1/appointments/:appointmentId/status
 * @desc    Update appointment status (confirm or cancel)
 * @access  Public
 * 
 * @param   {string} appointmentId - Appointment identifier
 * @body    {string} status - New status ('confirmed' or 'cancelled')
 * @body    {string} [reason] - Reason for cancellation
 * 
 * @returns {Object} { success, data: { appointment, message } }
 */
router.patch(
    '/:appointmentId/status',
    validate(updateAppointmentStatusValidation),
    updateAppointmentStatus
);

/**
 * @route   PATCH /api/v1/appointments/:appointmentId/reschedule
 * @desc    Reschedule an appointment
 * @access  Public
 * 
 * @param   {string} appointmentId - Appointment identifier
 * @body    {string} preferredDate - New preferred date
 * @body    {string} preferredTime - New preferred time
 * 
 * @returns {Object} { success, data: { appointment, message } }
 */
router.patch(
    '/:appointmentId/reschedule',
    [
        param('appointmentId')
            .isString()
            .trim()
            .matches(/^APT-\d{8}-[a-f0-9]{6}$/)
            .withMessage('Invalid appointment ID format'),
        body('preferredDate')
            .notEmpty()
            .withMessage('Preferred date is required')
            .isISO8601()
            .withMessage('Invalid date format')
            .custom((value) => {
                const appointmentDate = new Date(value);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (appointmentDate < today) {
                    throw new Error('Appointment date cannot be in the past');
                }
                return true;
            }),
        body('preferredTime')
            .isString()
            .trim()
            .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .withMessage('Time must be in HH:MM format'),
    ],
    validate([]),
    rescheduleAppointment
);

export default router;
