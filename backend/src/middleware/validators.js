import { body, param, query } from 'express-validator';

/**
 * Chat Validation Rules
 * Validation schemas for chat-related API endpoints
 */

/**
 * Validation rules for sending a message
 * POST /api/v1/chat/message
 */
export const sendMessageValidation = [
    body('sessionId')
        .isString()
        .trim()
        .isLength({ min: 8, max: 64 })
        .withMessage('Session ID must be 8-64 characters')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Session ID can only contain alphanumeric characters, dashes, and underscores'),

    body('message')
        .isString()
        .trim()
        .notEmpty()
        .withMessage('Message is required')
        .isLength({ max: 2000 })
        .withMessage('Message cannot exceed 2000 characters'),

    body('context')
        .optional()
        .isObject()
        .withMessage('Context must be an object'),

    body('context.userId')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 100 })
        .withMessage('User ID cannot exceed 100 characters'),

    body('context.userName')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 100 })
        .withMessage('User name cannot exceed 100 characters'),

    body('context.petName')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Pet name cannot exceed 100 characters'),

    body('context.source')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Source cannot exceed 50 characters'),
];

/**
 * Validation rules for getting chat history
 * GET /api/v1/chat/history/:sessionId
 */
export const getHistoryValidation = [
    param('sessionId')
        .isString()
        .trim()
        .isLength({ min: 8, max: 64 })
        .withMessage('Session ID must be 8-64 characters')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Invalid session ID format'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
        .toInt(),

    query('skip')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Skip must be a non-negative integer')
        .toInt(),
];

/**
 * Appointment Validation Rules
 * Validation schemas for appointment-related API endpoints
 */

/**
 * Validation rules for creating an appointment
 * POST /api/v1/appointments
 */
export const createAppointmentValidation = [
    body('sessionId')
        .isString()
        .trim()
        .isLength({ min: 8, max: 64 })
        .withMessage('Session ID must be 8-64 characters')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Invalid session ID format'),

    body('petOwnerName')
        .isString()
        .trim()
        .notEmpty()
        .withMessage('Pet owner name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Pet owner name must be 2-100 characters')
        .matches(/^[a-zA-Z\s\-']+$/)
        .withMessage('Pet owner name can only contain letters, spaces, hyphens, and apostrophes'),

    body('petName')
        .isString()
        .trim()
        .notEmpty()
        .withMessage('Pet name is required')
        .isLength({ min: 1, max: 50 })
        .withMessage('Pet name must be 1-50 characters'),

    body('phoneNumber')
        .isString()
        .trim()
        .notEmpty()
        .withMessage('Phone number is required')
        .matches(/^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/)
        .withMessage('Please provide a valid phone number'),

    body('preferredDate')
        .notEmpty()
        .withMessage('Preferred date is required')
        .isISO8601()
        .withMessage('Invalid date format. Use ISO 8601 format (YYYY-MM-DD)')
        .custom((value) => {
            const appointmentDate = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            appointmentDate.setHours(0, 0, 0, 0);

            if (appointmentDate < today) {
                throw new Error('Appointment date cannot be in the past');
            }
            return true;
        }),

    body('preferredTime')
        .isString()
        .trim()
        .notEmpty()
        .withMessage('Preferred time is required')
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Time must be in HH:MM format (e.g., 09:00, 14:30)'),

    body('notes')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notes cannot exceed 500 characters'),
];

/**
 * Validation rules for getting appointments by session
 * GET /api/v1/appointments/:sessionId
 */
export const getAppointmentsValidation = [
    param('sessionId')
        .isString()
        .trim()
        .isLength({ min: 8, max: 64 })
        .withMessage('Session ID must be 8-64 characters')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Invalid session ID format'),

    query('status')
        .optional()
        .isIn(['pending', 'confirmed', 'cancelled'])
        .withMessage('Status must be one of: pending, confirmed, cancelled'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Limit must be between 1 and 50')
        .toInt(),
];

/**
 * Validation rules for getting appointment by ID
 * GET /api/v1/appointments/detail/:appointmentId
 */
export const getAppointmentByIdValidation = [
    param('appointmentId')
        .isString()
        .trim()
        .matches(/^APT-\d{8}-[a-f0-9]{6}$/)
        .withMessage('Invalid appointment ID format'),
];

/**
 * Validation rules for updating appointment status
 * PATCH /api/v1/appointments/:appointmentId/status
 */
export const updateAppointmentStatusValidation = [
    param('appointmentId')
        .isString()
        .trim()
        .matches(/^APT-\d{8}-[a-f0-9]{6}$/)
        .withMessage('Invalid appointment ID format'),

    body('status')
        .isIn(['confirmed', 'cancelled'])
        .withMessage('Status must be either "confirmed" or "cancelled"'),

    body('reason')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Reason cannot exceed 500 characters'),
];
