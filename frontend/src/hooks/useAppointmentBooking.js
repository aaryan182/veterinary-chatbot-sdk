import { useState, useCallback, useMemo } from 'react';
import { createAppointment } from '../services/apiService';

/**
 * @fileoverview useAppointmentBooking Hook
 * Manages the appointment booking flow and form state
 */

// =============================================================================
// Configuration
// =============================================================================

/**
 * Appointment booking states
 */
export const BOOKING_STATES = {
    IDLE: 'idle',
    COLLECTING: 'collecting',
    CONFIRMING: 'confirming',
    SUBMITTING: 'submitting',
    SUCCESS: 'success',
    ERROR: 'error',
};

/**
 * Required fields for appointment booking
 */
const REQUIRED_FIELDS = ['petOwnerName', 'petName', 'phoneNumber', 'preferredDate', 'preferredTime'];

/**
 * Field configuration with validation rules
 */
const FIELD_CONFIG = {
    petOwnerName: {
        label: 'Your Name',
        placeholder: 'Enter your full name',
        validate: (value) => {
            if (!value || value.trim().length < 2) {
                return 'Name must be at least 2 characters';
            }
            if (!/^[a-zA-Z\s\-']+$/.test(value)) {
                return 'Name can only contain letters, spaces, hyphens, and apostrophes';
            }
            if (value.length > 100) {
                return 'Name is too long';
            }
            return null;
        },
    },
    petName: {
        label: "Pet's Name",
        placeholder: "Enter your pet's name",
        validate: (value) => {
            if (!value || value.trim().length < 1) {
                return 'Pet name is required';
            }
            if (value.length > 50) {
                return 'Pet name is too long';
            }
            return null;
        },
    },
    phoneNumber: {
        label: 'Phone Number',
        placeholder: 'Enter your phone number',
        validate: (value) => {
            if (!value) {
                return 'Phone number is required';
            }
            // Basic phone validation
            const phoneRegex = /^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/;
            if (!phoneRegex.test(value.replace(/\s/g, ''))) {
                return 'Please enter a valid phone number';
            }
            return null;
        },
    },
    preferredDate: {
        label: 'Preferred Date',
        placeholder: 'Select a date',
        type: 'date',
        validate: (value) => {
            if (!value) {
                return 'Date is required';
            }
            const selectedDate = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            selectedDate.setHours(0, 0, 0, 0);

            if (selectedDate < today) {
                return 'Date cannot be in the past';
            }

            // Check if date is within 90 days
            const maxDate = new Date(today);
            maxDate.setDate(maxDate.getDate() + 90);
            if (selectedDate > maxDate) {
                return 'Date must be within the next 90 days';
            }

            return null;
        },
    },
    preferredTime: {
        label: 'Preferred Time',
        placeholder: 'Select a time',
        type: 'time',
        validate: (value) => {
            if (!value) {
                return 'Time is required';
            }
            // Validate time format
            if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
                return 'Please enter a valid time (HH:MM)';
            }
            return null;
        },
    },
    notes: {
        label: 'Additional Notes',
        placeholder: 'Any special requests or concerns...',
        required: false,
        validate: (value) => {
            if (value && value.length > 500) {
                return 'Notes cannot exceed 500 characters';
            }
            return null;
        },
    },
};

/**
 * Initial form data
 */
const INITIAL_FORM_DATA = {
    petOwnerName: '',
    petName: '',
    phoneNumber: '',
    preferredDate: '',
    preferredTime: '',
    notes: '',
};

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * useAppointmentBooking Hook
 * 
 * Manages the complete appointment booking flow
 * 
 * @param {Object} options - Hook options
 * @param {string} options.sessionId - Current session ID
 * @param {Object} [options.initialData] - Pre-fill form data
 * @param {Function} [options.onSuccess] - Success callback
 * @param {Function} [options.onError] - Error callback
 * @param {Function} [options.onCancel] - Cancel callback
 * 
 * @returns {Object} Booking state and methods
 * 
 * @example
 * const {
 *   bookingState,
 *   formData,
 *   errors,
 *   updateField,
 *   validateField,
 *   submitAppointment,
 *   confirmAppointment,
 *   cancelBooking,
 *   resetBooking
 * } = useAppointmentBooking({ sessionId: 'sess_123' });
 */
export function useAppointmentBooking(options = {}) {
    const {
        sessionId,
        initialData = {},
        onSuccess,
        onError,
        onCancel,
    } = options;

    // ==========================================================================
    // State
    // ==========================================================================

    const [bookingState, setBookingState] = useState(BOOKING_STATES.IDLE);
    const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA, ...initialData });
    const [errors, setErrors] = useState({});
    const [submitError, setSubmitError] = useState(null);
    const [result, setResult] = useState(null);
    const [currentFieldIndex, setCurrentFieldIndex] = useState(0);

    // ==========================================================================
    // Computed Values
    // ==========================================================================

    /**
     * Get list of missing required fields
     */
    const missingFields = useMemo(() => {
        return REQUIRED_FIELDS.filter((field) => {
            const value = formData[field];
            return !value || (typeof value === 'string' && value.trim() === '');
        });
    }, [formData]);

    /**
     * Check if form is complete
     */
    const isComplete = useMemo(() => {
        return missingFields.length === 0;
    }, [missingFields]);

    /**
     * Check if form is valid (no errors)
     */
    const isValid = useMemo(() => {
        return isComplete && Object.values(errors).every((e) => !e);
    }, [isComplete, errors]);

    /**
     * Get the current field being collected
     */
    const currentField = useMemo(() => {
        if (currentFieldIndex < REQUIRED_FIELDS.length) {
            return REQUIRED_FIELDS[currentFieldIndex];
        }
        return null;
    }, [currentFieldIndex]);

    /**
     * Get progress percentage
     */
    const progress = useMemo(() => {
        const filledFields = REQUIRED_FIELDS.filter((field) => {
            const value = formData[field];
            return value && (typeof value !== 'string' || value.trim() !== '');
        });
        return Math.round((filledFields.length / REQUIRED_FIELDS.length) * 100);
    }, [formData]);

    /**
     * Format form data for display
     */
    const formattedData = useMemo(() => {
        const data = { ...formData };

        // Format date for display
        if (data.preferredDate) {
            const date = new Date(data.preferredDate);
            data.formattedDate = date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        }

        return data;
    }, [formData]);

    // ==========================================================================
    // Field Updates
    // ==========================================================================

    /**
     * Validate a single field
     * @param {string} fieldName - Field to validate
     * @param {*} value - Value to validate
     * @returns {string|null} Error message or null
     */
    const validateField = useCallback((fieldName, value) => {
        const config = FIELD_CONFIG[fieldName];
        if (!config) return null;

        const error = config.validate(value);
        setErrors((prev) => ({ ...prev, [fieldName]: error }));
        return error;
    }, []);

    /**
     * Update a form field value
     * @param {string} fieldName - Field to update
     * @param {*} value - New value
     */
    const updateField = useCallback((fieldName, value) => {
        setFormData((prev) => ({ ...prev, [fieldName]: value }));

        // Clear error when user starts typing
        if (errors[fieldName]) {
            setErrors((prev) => ({ ...prev, [fieldName]: null }));
        }
    }, [errors]);

    /**
     * Update field and validate
     * @param {string} fieldName - Field to update
     * @param {*} value - New value
     * @returns {string|null} Validation error or null
     */
    const updateAndValidate = useCallback((fieldName, value) => {
        updateField(fieldName, value);
        return validateField(fieldName, value);
    }, [updateField, validateField]);

    /**
     * Move to next field
     */
    const nextField = useCallback(() => {
        const currentFieldName = REQUIRED_FIELDS[currentFieldIndex];
        const error = validateField(currentFieldName, formData[currentFieldName]);

        if (!error && currentFieldIndex < REQUIRED_FIELDS.length - 1) {
            setCurrentFieldIndex((prev) => prev + 1);
            return true;
        }
        return false;
    }, [currentFieldIndex, formData, validateField]);

    /**
     * Move to previous field
     */
    const prevField = useCallback(() => {
        if (currentFieldIndex > 0) {
            setCurrentFieldIndex((prev) => prev - 1);
            return true;
        }
        return false;
    }, [currentFieldIndex]);

    // ==========================================================================
    // Booking Flow
    // ==========================================================================

    /**
     * Start the booking flow
     */
    const startBooking = useCallback(() => {
        setBookingState(BOOKING_STATES.COLLECTING);
        setCurrentFieldIndex(0);
        setSubmitError(null);
        setResult(null);
    }, []);

    /**
     * Validate all fields
     * @returns {boolean} True if all fields are valid
     */
    const validateAll = useCallback(() => {
        const newErrors = {};
        let hasErrors = false;

        REQUIRED_FIELDS.forEach((field) => {
            const error = FIELD_CONFIG[field].validate(formData[field]);
            if (error) {
                newErrors[field] = error;
                hasErrors = true;
            }
        });

        setErrors(newErrors);
        return !hasErrors;
    }, [formData]);

    /**
     * Move to confirmation step
     */
    const confirmAppointment = useCallback(() => {
        if (validateAll()) {
            setBookingState(BOOKING_STATES.CONFIRMING);
            return true;
        }
        return false;
    }, [validateAll]);

    /**
     * Submit the appointment
     */
    const submitAppointment = useCallback(async () => {
        if (!sessionId) {
            setSubmitError('Session not available. Please refresh and try again.');
            setBookingState(BOOKING_STATES.ERROR);
            return;
        }

        if (!validateAll()) {
            setBookingState(BOOKING_STATES.COLLECTING);
            return;
        }

        setBookingState(BOOKING_STATES.SUBMITTING);
        setSubmitError(null);

        try {
            const appointmentData = {
                petOwnerName: formData.petOwnerName.trim(),
                petName: formData.petName.trim(),
                phoneNumber: formData.phoneNumber.trim(),
                preferredDate: formData.preferredDate,
                preferredTime: formData.preferredTime,
                notes: formData.notes?.trim() || undefined,
            };

            const response = await createAppointment(sessionId, appointmentData);

            setResult(response.appointment);
            setBookingState(BOOKING_STATES.SUCCESS);

            if (onSuccess) {
                onSuccess(response.appointment);
            }

        } catch (err) {
            console.error('[useAppointmentBooking] Submit error:', err);

            const errorMessage = err.message || 'Failed to create appointment. Please try again.';
            setSubmitError(errorMessage);
            setBookingState(BOOKING_STATES.ERROR);

            if (onError) {
                onError(err);
            }
        }
    }, [sessionId, formData, validateAll, onSuccess, onError]);

    /**
     * Cancel the booking flow
     */
    const cancelBooking = useCallback(() => {
        setBookingState(BOOKING_STATES.IDLE);
        setFormData({ ...INITIAL_FORM_DATA });
        setErrors({});
        setSubmitError(null);
        setCurrentFieldIndex(0);

        if (onCancel) {
            onCancel();
        }
    }, [onCancel]);

    /**
     * Reset everything and start fresh
     */
    const resetBooking = useCallback(() => {
        setBookingState(BOOKING_STATES.IDLE);
        setFormData({ ...INITIAL_FORM_DATA });
        setErrors({});
        setSubmitError(null);
        setResult(null);
        setCurrentFieldIndex(0);
    }, []);

    /**
     * Retry after error
     */
    const retry = useCallback(() => {
        setSubmitError(null);
        setBookingState(BOOKING_STATES.CONFIRMING);
    }, []);

    /**
     * Go back to editing from confirmation
     */
    const editDetails = useCallback(() => {
        setBookingState(BOOKING_STATES.COLLECTING);
    }, []);

    // ==========================================================================
    // Helper Methods
    // ==========================================================================

    /**
     * Get prompt message for the current booking state
     */
    const getPromptMessage = useCallback(() => {
        switch (bookingState) {
            case BOOKING_STATES.COLLECTING:
                if (currentField) {
                    return FIELD_CONFIG[currentField]?.label
                        ? `Please enter ${FIELD_CONFIG[currentField].label.toLowerCase()}`
                        : 'Please provide the required information';
                }
                return 'Let me help you book an appointment. I\'ll need a few details.';

            case BOOKING_STATES.CONFIRMING:
                return 'Please review your appointment details and confirm.';

            case BOOKING_STATES.SUBMITTING:
                return 'Creating your appointment...';

            case BOOKING_STATES.SUCCESS:
                return `Your appointment has been scheduled for ${formattedData.formattedDate} at ${formData.preferredTime}.`;

            case BOOKING_STATES.ERROR:
                return submitError || 'Something went wrong. Please try again.';

            default:
                return 'Would you like to book an appointment?';
        }
    }, [bookingState, currentField, formattedData, formData.preferredTime, submitError]);

    // ==========================================================================
    // Return
    // ==========================================================================

    return {
        // State
        bookingState,
        formData,
        formattedData,
        errors,
        submitError,
        result,
        currentField,
        currentFieldIndex,

        // Computed
        missingFields,
        isComplete,
        isValid,
        progress,

        // Field actions
        updateField,
        updateAndValidate,
        validateField,
        validateAll,
        nextField,
        prevField,

        // Flow actions
        startBooking,
        confirmAppointment,
        submitAppointment,
        cancelBooking,
        resetBooking,
        retry,
        editDetails,

        // Helpers
        getPromptMessage,
        fieldConfig: FIELD_CONFIG,
    };
}

export default useAppointmentBooking;
