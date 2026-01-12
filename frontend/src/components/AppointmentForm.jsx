import { memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { BOOKING_STATES } from '../hooks/useAppointmentBooking';

/**
 * AppointmentForm Component
 * Inline form for collecting appointment details within the chat
 */
function AppointmentForm({
    bookingState,
    formData,
    formattedData,
    errors,
    submitError,
    appointmentResult,
    isFormComplete,
    updateField,
    validateField,
    confirmAppointment,
    submitAppointment,
    cancelBooking,
    getPromptMessage,
}) {
    // ==========================================================================
    // Handlers
    // ==========================================================================

    const handleFieldChange = useCallback((fieldName) => (e) => {
        updateField(fieldName, e.target.value);
    }, [updateField]);

    const handleFieldBlur = useCallback((fieldName) => () => {
        validateField(fieldName, formData[fieldName]);
    }, [validateField, formData]);

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        if (bookingState === BOOKING_STATES.COLLECTING && isFormComplete) {
            confirmAppointment();
        } else if (bookingState === BOOKING_STATES.CONFIRMING) {
            submitAppointment();
        }
    }, [bookingState, isFormComplete, confirmAppointment, submitAppointment]);

    // ==========================================================================
    // Render Helpers
    // ==========================================================================

    const renderField = (name, label, type = 'text', placeholder = '') => {
        const hasError = !!errors[name];
        const value = formData[name] || '';

        return (
            <div className="space-y-1">
                <label
                    htmlFor={`appt-${name}`}
                    className="block text-xs font-medium text-gray-700"
                >
                    {label} <span className="text-red-500">*</span>
                </label>
                <input
                    id={`appt-${name}`}
                    type={type}
                    value={value}
                    onChange={handleFieldChange(name)}
                    onBlur={handleFieldBlur(name)}
                    placeholder={placeholder}
                    className={`
            w-full px-3 py-2 rounded-lg border text-sm
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-indigo-500/30
            ${hasError
                            ? 'border-red-300 bg-red-50 focus:border-red-400'
                            : 'border-gray-200 bg-white focus:border-indigo-400'
                        }
          `}
                    disabled={bookingState === BOOKING_STATES.SUBMITTING}
                />
                {hasError && (
                    <p className="text-xs text-red-600">{errors[name]}</p>
                )}
            </div>
        );
    };

    // ==========================================================================
    // Render States
    // ==========================================================================

    // Success State
    if (bookingState === BOOKING_STATES.SUCCESS && appointmentResult) {
        return (
            <div className="p-4 border-t border-gray-200 bg-white space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Appointment Scheduled!</span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">Reference:</span> {appointmentResult.appointmentId}</p>
                    <p><span className="font-medium">Date:</span> {formattedData.formattedDate}</p>
                    <p><span className="font-medium">Time:</span> {formData.preferredTime}</p>
                </div>
            </div>
        );
    }

    // Error State
    if (bookingState === BOOKING_STATES.ERROR) {
        return (
            <div className="p-4 border-t border-gray-200 bg-white space-y-3">
                <div className="flex items-center gap-2 text-red-600">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Booking Failed</span>
                </div>
                <p className="text-sm text-gray-600">{submitError || 'Something went wrong. Please try again.'}</p>
                <div className="flex gap-2">
                    <button
                        onClick={confirmAppointment}
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium
                     hover:bg-indigo-700 transition-colors"
                    >
                        Try Again
                    </button>
                    <button
                        onClick={cancelBooking}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    // Confirmation State
    if (bookingState === BOOKING_STATES.CONFIRMING) {
        return (
            <div className="p-4 border-t border-gray-200 bg-white space-y-4">
                <h4 className="font-medium text-gray-900">Confirm Your Appointment</h4>

                <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Name:</span>
                        <span className="font-medium">{formData.petOwnerName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Pet:</span>
                        <span className="font-medium">{formData.petName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Phone:</span>
                        <span className="font-medium">{formData.phoneNumber}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Date:</span>
                        <span className="font-medium">{formattedData.formattedDate}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Time:</span>
                        <span className="font-medium">{formData.preferredTime}</span>
                    </div>
                    {formData.notes && (
                        <div className="pt-2 border-t border-gray-200">
                            <span className="text-gray-500">Notes:</span>
                            <p className="mt-1">{formData.notes}</p>
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={submitAppointment}
                        disabled={bookingState === BOOKING_STATES.SUBMITTING}
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium
                     hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
                    >
                        {bookingState === BOOKING_STATES.SUBMITTING ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Booking...
                            </>
                        ) : (
                            'Confirm Booking'
                        )}
                    </button>
                    <button
                        onClick={cancelBooking}
                        disabled={bookingState === BOOKING_STATES.SUBMITTING}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm disabled:opacity-50"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    // Collecting State (Form)
    return (
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-white space-y-3">
            <p className="text-sm text-gray-600 mb-3">{getPromptMessage()}</p>

            <div className="grid grid-cols-2 gap-3">
                {renderField('petOwnerName', 'Your Name', 'text', 'John Doe')}
                {renderField('petName', "Pet's Name", 'text', 'Buddy')}
            </div>

            {renderField('phoneNumber', 'Phone Number', 'tel', '+1 555-123-4567')}

            <div className="grid grid-cols-2 gap-3">
                {renderField('preferredDate', 'Preferred Date', 'date')}
                {renderField('preferredTime', 'Preferred Time', 'time')}
            </div>

            <div className="space-y-1">
                <label
                    htmlFor="appt-notes"
                    className="block text-xs font-medium text-gray-700"
                >
                    Notes (Optional)
                </label>
                <textarea
                    id="appt-notes"
                    value={formData.notes || ''}
                    onChange={handleFieldChange('notes')}
                    placeholder="Any special concerns or requests..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm
                   transition-colors duration-200 resize-none
                   focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                    disabled={bookingState === BOOKING_STATES.SUBMITTING}
                />
            </div>

            <div className="flex gap-2 pt-2">
                <button
                    type="submit"
                    disabled={!isFormComplete || bookingState === BOOKING_STATES.SUBMITTING}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium
                   hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Review Appointment
                </button>
                <button
                    type="button"
                    onClick={cancelBooking}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}

AppointmentForm.propTypes = {
    bookingState: PropTypes.oneOf(Object.values(BOOKING_STATES)).isRequired,
    formData: PropTypes.object.isRequired,
    formattedData: PropTypes.object.isRequired,
    errors: PropTypes.object.isRequired,
    submitError: PropTypes.string,
    appointmentResult: PropTypes.object,
    isFormComplete: PropTypes.bool.isRequired,
    updateField: PropTypes.func.isRequired,
    validateField: PropTypes.func.isRequired,
    confirmAppointment: PropTypes.func.isRequired,
    submitAppointment: PropTypes.func.isRequired,
    cancelBooking: PropTypes.func.isRequired,
    getPromptMessage: PropTypes.func.isRequired,
};

export default memo(AppointmentForm);
