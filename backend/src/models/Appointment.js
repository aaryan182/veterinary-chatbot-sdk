import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * @typedef {Object} AppointmentDocument
 * @property {string} appointmentId - Unique appointment identifier (auto-generated)
 * @property {string} sessionId - Reference to the conversation session
 * @property {string} petOwnerName - Name of the pet owner
 * @property {string} petName - Name of the pet
 * @property {string} phoneNumber - Contact phone number
 * @property {Date} preferredDate - Preferred appointment date
 * @property {string} preferredTime - Preferred appointment time slot
 * @property {'pending'|'confirmed'|'cancelled'} status - Appointment status
 * @property {string} [notes] - Optional notes or special requests
 * @property {Date} createdAt - Appointment creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 */

/**
 * Phone number validation regex
 * Supports formats:
 * - (123) 456-7890
 * - 123-456-7890
 * - 123.456.7890
 * - 1234567890
 * - +1 123 456 7890
 * - +91-1234567890
 */
const PHONE_REGEX = /^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/;

/**
 * Valid time slots for appointments
 */
const VALID_TIME_SLOTS = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00',
];

/**
 * Generate a unique appointment ID
 * Format: APT-YYYYMMDD-XXXXXX (e.g., APT-20260111-a1b2c3)
 * @returns {string} Generated appointment ID
 */
const generateAppointmentId = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = crypto.randomBytes(3).toString('hex');
    return `APT-${dateStr}-${randomStr}`;
};

/**
 * Appointment Schema
 * Stores veterinary appointment requests from chatbot conversations
 * 
 * @example
 * const appointment = new Appointment({
 *   sessionId: 'sess_abc123',
 *   petOwnerName: 'John Doe',
 *   petName: 'Buddy',
 *   phoneNumber: '+1-555-123-4567',
 *   preferredDate: new Date('2026-01-15'),
 *   preferredTime: '10:00',
 *   notes: 'Annual checkup needed'
 * });
 */
const appointmentSchema = new mongoose.Schema(
    {
        /**
         * Unique appointment identifier
         * Auto-generated with format: APT-YYYYMMDD-XXXXXX
         * @type {string}
         */
        appointmentId: {
            type: String,
            unique: true,
            index: true,
            default: generateAppointmentId,
            immutable: true, // Cannot be changed after creation
        },

        /**
         * Reference to the conversation session
         * Links the appointment to its originating chat session
         * @type {string}
         */
        sessionId: {
            type: String,
            required: [true, 'Session ID is required'],
            trim: true,
            index: true,
            validate: {
                validator: function (v) {
                    return /^[a-zA-Z0-9_-]{8,64}$/.test(v);
                },
                message: 'Invalid session ID format',
            },
        },

        /**
         * Name of the pet owner
         * @type {string}
         */
        petOwnerName: {
            type: String,
            required: [true, 'Pet owner name is required'],
            trim: true,
            minlength: [2, 'Pet owner name must be at least 2 characters'],
            maxlength: [100, 'Pet owner name cannot exceed 100 characters'],
            validate: {
                validator: function (v) {
                    // Allow letters, spaces, hyphens, and apostrophes
                    return /^[a-zA-Z\s\-']+$/.test(v);
                },
                message: 'Pet owner name can only contain letters, spaces, hyphens, and apostrophes',
            },
        },

        /**
         * Name of the pet
         * @type {string}
         */
        petName: {
            type: String,
            required: [true, 'Pet name is required'],
            trim: true,
            minlength: [1, 'Pet name must be at least 1 character'],
            maxlength: [50, 'Pet name cannot exceed 50 characters'],
        },

        /**
         * Contact phone number
         * Validated against common phone number formats
         * @type {string}
         */
        phoneNumber: {
            type: String,
            required: [true, 'Phone number is required'],
            trim: true,
            validate: {
                validator: function (v) {
                    return PHONE_REGEX.test(v);
                },
                message: 'Please provide a valid phone number',
            },
        },

        /**
         * Preferred appointment date
         * Must be a future date (validated via middleware)
         * @type {Date}
         */
        preferredDate: {
            type: Date,
            required: [true, 'Preferred date is required'],
            validate: {
                validator: function (v) {
                    // Date must be today or in the future
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const appointmentDate = new Date(v);
                    appointmentDate.setHours(0, 0, 0, 0);
                    return appointmentDate >= today;
                },
                message: 'Appointment date cannot be in the past',
            },
        },

        /**
         * Preferred time slot
         * Must be one of the valid time slots
         * @type {string}
         */
        preferredTime: {
            type: String,
            required: [true, 'Preferred time is required'],
            trim: true,
            validate: {
                validator: function (v) {
                    // Check if it's a valid time format (HH:MM)
                    if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v)) {
                        return false;
                    }
                    // Optionally validate against predefined time slots
                    // Return true to allow any valid time, or use VALID_TIME_SLOTS for strict validation
                    return true;
                },
                message: 'Please provide a valid time in HH:MM format',
            },
        },

        /**
         * Appointment status
         * @type {'pending'|'confirmed'|'cancelled'}
         */
        status: {
            type: String,
            enum: {
                values: ['pending', 'confirmed', 'cancelled'],
                message: 'Status must be one of: pending, confirmed, cancelled',
            },
            default: 'pending',
            index: true,
        },

        /**
         * Optional notes or special requests
         * @type {string}
         */
        notes: {
            type: String,
            trim: true,
            maxlength: [500, 'Notes cannot exceed 500 characters'],
            default: null,
        },

        /**
         * Reason for cancellation (if applicable)
         * @type {string}
         */
        cancellationReason: {
            type: String,
            trim: true,
            maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
            default: null,
        },

        /**
         * Confirmation timestamp
         * Set when status changes to 'confirmed'
         * @type {Date}
         */
        confirmedAt: {
            type: Date,
            default: null,
        },

        /**
         * Cancellation timestamp
         * Set when status changes to 'cancelled'
         * @type {Date}
         */
        cancelledAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt
        toJSON: {
            virtuals: true,
            transform: function (_doc, ret) {
                ret.id = ret._id;
                delete ret._id;
                delete ret.__v;
                return ret;
            },
        },
        toObject: {
            virtuals: true,
        },
    }
);

// =============================================================================
// Indexes
// =============================================================================

/**
 * Compound index for status-based queries with date sorting
 */
appointmentSchema.index({ status: 1, preferredDate: 1 });

/**
 * Index for sorting by creation date (most recent first)
 */
appointmentSchema.index({ createdAt: -1 });

/**
 * Index for finding appointments by date
 */
appointmentSchema.index({ preferredDate: 1, preferredTime: 1 });

/**
 * Compound index for session-based appointment lookups
 */
appointmentSchema.index({ sessionId: 1, createdAt: -1 });

/**
 * Index for phone number lookups
 */
appointmentSchema.index({ phoneNumber: 1 });

// =============================================================================
// Virtual Properties
// =============================================================================

/**
 * Virtual property to get formatted date string
 * @returns {string} Formatted date (e.g., "January 11, 2026")
 */
appointmentSchema.virtual('formattedDate').get(function () {
    if (!this.preferredDate) {
        return null;
    }
    return this.preferredDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
});

/**
 * Virtual property to get full appointment datetime
 * @returns {string} Combined date and time string
 */
appointmentSchema.virtual('appointmentDateTime').get(function () {
    if (!this.preferredDate || !this.preferredTime) {
        return null;
    }
    return `${this.formattedDate} at ${this.preferredTime}`;
});

/**
 * Virtual property to check if appointment is upcoming
 * @returns {boolean} True if appointment is in the future
 */
appointmentSchema.virtual('isUpcoming').get(function () {
    if (!this.preferredDate || this.status === 'cancelled') {
        return false;
    }
    return new Date(this.preferredDate) >= new Date();
});

// =============================================================================
// Instance Methods
// =============================================================================

/**
 * Confirm the appointment
 * @returns {Promise<AppointmentDocument>} The updated appointment
 * @throws {Error} If appointment is already cancelled
 * 
 * @example
 * const appointment = await Appointment.findById(appointmentId);
 * await appointment.confirm();
 */
appointmentSchema.methods.confirm = async function () {
    if (this.status === 'cancelled') {
        throw new Error('Cannot confirm a cancelled appointment');
    }

    this.status = 'confirmed';
    this.confirmedAt = new Date();
    return this.save();
};

/**
 * Cancel the appointment
 * @param {string} [reason] - Optional cancellation reason
 * @returns {Promise<AppointmentDocument>} The updated appointment
 * 
 * @example
 * const appointment = await Appointment.findById(appointmentId);
 * await appointment.cancel('Pet owner requested cancellation');
 */
appointmentSchema.methods.cancel = async function (reason = null) {
    this.status = 'cancelled';
    this.cancelledAt = new Date();
    if (reason) {
        this.cancellationReason = reason;
    }
    return this.save();
};

/**
 * Reschedule the appointment
 * @param {Date} newDate - New preferred date
 * @param {string} newTime - New preferred time
 * @returns {Promise<AppointmentDocument>} The updated appointment
 * @throws {Error} If appointment is cancelled or date is in the past
 * 
 * @example
 * const appointment = await Appointment.findById(appointmentId);
 * await appointment.reschedule(new Date('2026-01-20'), '14:00');
 */
appointmentSchema.methods.reschedule = async function (newDate, newTime) {
    if (this.status === 'cancelled') {
        throw new Error('Cannot reschedule a cancelled appointment');
    }

    // Validate new date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentDate = new Date(newDate);
    appointmentDate.setHours(0, 0, 0, 0);

    if (appointmentDate < today) {
        throw new Error('New appointment date cannot be in the past');
    }

    // Validate time format
    if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(newTime)) {
        throw new Error('Invalid time format. Please use HH:MM format');
    }

    this.preferredDate = newDate;
    this.preferredTime = newTime;
    this.status = 'pending'; // Reset to pending after reschedule

    return this.save();
};

/**
 * Update notes
 * @param {string} notes - New notes content
 * @returns {Promise<AppointmentDocument>} The updated appointment
 * 
 * @example
 * const appointment = await Appointment.findById(appointmentId);
 * await appointment.updateNotes('Vaccination needed for 3-year-old dog');
 */
appointmentSchema.methods.updateNotes = async function (notes) {
    if (notes && notes.length > 500) {
        throw new Error('Notes cannot exceed 500 characters');
    }
    this.notes = notes ? notes.trim() : null;
    return this.save();
};

// =============================================================================
// Static Methods
// =============================================================================

/**
 * Find an appointment by appointment ID
 * @param {string} appointmentId - The appointment ID to search for
 * @returns {Promise<AppointmentDocument|null>} The appointment or null
 * @throws {Error} If appointmentId is not provided
 * 
 * @example
 * const appointment = await Appointment.findByAppointmentId('APT-20260111-a1b2c3');
 */
appointmentSchema.statics.findByAppointmentId = async function (appointmentId) {
    if (!appointmentId) {
        throw new Error('Appointment ID is required');
    }
    return this.findOne({ appointmentId });
};

/**
 * Find all appointments for a session
 * @param {string} sessionId - The session ID to search for
 * @param {Object} [options={}] - Query options
 * @param {number} [options.limit=10] - Maximum appointments to return
 * @param {string} [options.status] - Filter by status
 * @returns {Promise<AppointmentDocument[]>} Array of appointments
 * 
 * @example
 * const appointments = await Appointment.findBySessionId('sess_abc123');
 */
appointmentSchema.statics.findBySessionId = async function (sessionId, options = {}) {
    if (!sessionId) {
        throw new Error('Session ID is required');
    }

    const { limit = 10, status } = options;
    const query = { sessionId };

    if (status) {
        query.status = status;
    }

    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(limit);
};

/**
 * Find upcoming appointments
 * @param {Object} [options={}] - Query options
 * @param {number} [options.limit=50] - Maximum appointments to return
 * @param {number} [options.daysAhead=7] - Number of days to look ahead
 * @returns {Promise<AppointmentDocument[]>} Array of upcoming appointments
 * 
 * @example
 * const upcomingAppointments = await Appointment.findUpcoming({ daysAhead: 14 });
 */
appointmentSchema.statics.findUpcoming = async function (options = {}) {
    const { limit = 50, daysAhead = 7 } = options;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + daysAhead);

    return this.find({
        status: { $ne: 'cancelled' },
        preferredDate: {
            $gte: today,
            $lte: endDate,
        },
    })
        .sort({ preferredDate: 1, preferredTime: 1 })
        .limit(limit);
};

/**
 * Find appointments by phone number
 * @param {string} phoneNumber - The phone number to search for
 * @returns {Promise<AppointmentDocument[]>} Array of appointments
 * 
 * @example
 * const appointments = await Appointment.findByPhoneNumber('+1-555-123-4567');
 */
appointmentSchema.statics.findByPhoneNumber = async function (phoneNumber) {
    if (!phoneNumber) {
        throw new Error('Phone number is required');
    }
    return this.find({ phoneNumber })
        .sort({ createdAt: -1 });
};

/**
 * Get appointment statistics
 * @param {Object} [filter={}] - Optional filter criteria
 * @returns {Promise<Object>} Statistics object
 * 
 * @example
 * const stats = await Appointment.getStats();
 * console.log(`Total appointments: ${stats.total}`);
 */
appointmentSchema.statics.getStats = async function (filter = {}) {
    const pipeline = [
        { $match: filter },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
            },
        },
    ];

    const results = await this.aggregate(pipeline);

    const stats = {
        total: 0,
        pending: 0,
        confirmed: 0,
        cancelled: 0,
    };

    results.forEach((result) => {
        stats[result._id] = result.count;
        stats.total += result.count;
    });

    return stats;
};

/**
 * Check for conflicting appointments
 * @param {Date} date - Appointment date
 * @param {string} time - Appointment time
 * @param {string} [excludeId] - Appointment ID to exclude (for rescheduling)
 * @returns {Promise<boolean>} True if there's a conflict
 * 
 * @example
 * const hasConflict = await Appointment.hasConflict(new Date('2026-01-15'), '10:00');
 */
appointmentSchema.statics.hasConflict = async function (date, time, excludeId = null) {
    const appointmentDate = new Date(date);
    appointmentDate.setHours(0, 0, 0, 0);

    const query = {
        preferredDate: appointmentDate,
        preferredTime: time,
        status: { $ne: 'cancelled' },
    };

    if (excludeId) {
        query.appointmentId = { $ne: excludeId };
    }

    const count = await this.countDocuments(query);
    return count > 0;
};

// =============================================================================
// Middleware (Hooks)
// =============================================================================

/**
 * Pre-save middleware to validate and process data
 */
appointmentSchema.pre('save', function (next) {
    // Generate appointmentId if not present (for new documents)
    if (!this.appointmentId) {
        this.appointmentId = generateAppointmentId();
    }

    // Normalize phone number (remove extra spaces)
    if (this.phoneNumber) {
        this.phoneNumber = this.phoneNumber.replace(/\s+/g, ' ').trim();
    }

    // Ensure preferredDate is set to start of day for consistent comparisons
    if (this.preferredDate) {
        const date = new Date(this.preferredDate);
        date.setHours(0, 0, 0, 0);
        this.preferredDate = date;
    }

    next();
});

/**
 * Pre-validate middleware for additional validation logic
 */
appointmentSchema.pre('validate', function (next) {
    // Additional validation for cancelled appointments
    if (this.status === 'cancelled' && !this.cancelledAt) {
        this.cancelledAt = new Date();
    }

    // Additional validation for confirmed appointments
    if (this.status === 'confirmed' && !this.confirmedAt) {
        this.confirmedAt = new Date();
    }

    next();
});

// =============================================================================
// Export Constants
// =============================================================================

export { VALID_TIME_SLOTS, PHONE_REGEX };

// =============================================================================
// Model Export
// =============================================================================

/**
 * Appointment Model
 * @type {mongoose.Model<AppointmentDocument>}
 */
export const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;
