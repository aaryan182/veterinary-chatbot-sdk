import { geminiService } from './geminiService.js';
import { logger } from '../utils/logger.js';

/**
 * @fileoverview Appointment Flow Service
 * Manages intelligent conversational appointment booking with field extraction
 */

// =============================================================================
// Configuration
// =============================================================================

/**
 * Required fields for appointment booking
 */
const REQUIRED_FIELDS = [
    'petOwnerName',
    'petName',
    'phoneNumber',
    'preferredDate',
    'preferredTime',
];

/**
 * Field configuration with prompts and validation rules
 */
const FIELD_CONFIG = {
    petOwnerName: {
        prompt: "What's your name?",
        followUp: "Could you please tell me your name?",
        errorPrompt: "I didn't quite catch your name. Could you please provide your full name?",
        validate: (value) => {
            if (!value || value.trim().length < 2) {
                return { valid: false, error: 'Name must be at least 2 characters' };
            }
            if (value.length > 50) {
                return { valid: false, error: 'Name is too long' };
            }
            if (!/^[a-zA-Z\s\-']+$/.test(value)) {
                return { valid: false, error: 'Name should only contain letters' };
            }
            return { valid: true };
        },
        extractPatterns: [
            /my name is (\w+(?:\s+\w+)?)/i,
            /i'm (\w+(?:\s+\w+)?)/i,
            /i am (\w+(?:\s+\w+)?)/i,
            /call me (\w+)/i,
            /this is (\w+(?:\s+\w+)?)/i,
        ],
    },

    petName: {
        prompt: "What's your pet's name?",
        followUp: "And what's your furry friend's name?",
        errorPrompt: "I need your pet's name to continue. What should I call your pet?",
        validate: (value) => {
            if (!value || value.trim().length < 1) {
                return { valid: false, error: 'Pet name is required' };
            }
            if (value.length > 30) {
                return { valid: false, error: 'Pet name is too long' };
            }
            return { valid: true };
        },
        extractPatterns: [
            /my (?:pet|dog|cat|bird|rabbit)'s name is (\w+)/i,
            /(?:pet|dog|cat|bird|rabbit) (?:is called|named) (\w+)/i,
            /(?:his|her|its) name is (\w+)/i,
            /called (\w+)/i,
            /named (\w+)/i,
        ],
    },

    phoneNumber: {
        prompt: "What's the best phone number to reach you?",
        followUp: "What phone number should we use to contact you?",
        errorPrompt: "I need a valid phone number. Please provide your contact number (e.g., 555-123-4567).",
        validate: (value) => {
            if (!value) {
                return { valid: false, error: 'Phone number is required' };
            }
            // Remove all non-digits for validation
            const digits = value.replace(/\D/g, '');
            if (digits.length < 10 || digits.length > 15) {
                return { valid: false, error: 'Please provide a valid phone number with 10+ digits' };
            }
            return { valid: true };
        },
        extractPatterns: [
            /(\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/,
            /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/,
            /(\d{10,15})/,
        ],
    },

    preferredDate: {
        prompt: "What date works best for you? (e.g., January 20, tomorrow, next Monday)",
        followUp: "When would you like to schedule the appointment?",
        errorPrompt: "I couldn't understand that date. Please specify a date like 'January 20' or 'next Monday'.",
        validate: (value) => {
            if (!value) {
                return { valid: false, error: 'Date is required' };
            }
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                return { valid: false, error: 'Invalid date format' };
            }
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (date < today) {
                return { valid: false, error: 'Date cannot be in the past' };
            }
            const maxDate = new Date(today);
            maxDate.setDate(maxDate.getDate() + 90);
            if (date > maxDate) {
                return { valid: false, error: 'Date must be within the next 90 days' };
            }
            return { valid: true };
        },
        // Date extraction is handled by parseNaturalDate
    },

    preferredTime: {
        prompt: "What time would you prefer? (e.g., 10:00 AM, afternoon, 2pm)",
        followUp: "What time of day works best for you?",
        errorPrompt: "I need a valid time. Please specify like '10:00 AM' or 'afternoon'.",
        validate: (value) => {
            if (!value) {
                return { valid: false, error: 'Time is required' };
            }
            // Value should be in HH:MM format at this point
            if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
                return { valid: false, error: 'Invalid time format' };
            }
            return { valid: true };
        },
        // Time extraction is handled by parseNaturalTime
    },
};

/**
 * AI prompt for extracting appointment details
 */
const EXTRACTION_PROMPT = `Analyze the following message from a user who wants to book a veterinary appointment. Extract any appointment-related information they have provided.

User message: "{message}"

Previous conversation context (last few messages):
{context}

Currently collected information:
{collected}

Extract and return a JSON object with any of these fields that are present in the message:
{
  "petOwnerName": "extracted name or null",
  "petName": "extracted pet name or null",
  "phoneNumber": "extracted phone number or null",
  "preferredDate": "extracted date in YYYY-MM-DD format or null",
  "preferredTime": "extracted time in HH:MM (24h) format or null",
  "wantsToCancel": boolean (true if user wants to cancel booking),
  "wantsToRestart": boolean (true if user wants to start over),
  "confirmation": "yes" | "no" | null (if user is responding to confirmation)
}

Convert natural language dates like "tomorrow", "next Monday", "Jan 20" to YYYY-MM-DD format.
Convert natural language times like "morning", "afternoon", "2pm" to HH:MM format.
Today's date is: ${new Date().toISOString().split('T')[0]}

Return ONLY the JSON object, no explanation or markdown.`;

// =============================================================================
// Natural Language Parsing
// =============================================================================

/**
 * Parse natural language date expressions
 * @param {string} text - Text containing date
 * @returns {string|null} Date in YYYY-MM-DD format or null
 */
function parseNaturalDate(text) {
    if (!text) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lowerText = text.toLowerCase().trim();

    // Today
    if (lowerText === 'today') {
        return formatDate(today);
    }

    // Tomorrow
    if (lowerText === 'tomorrow') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return formatDate(tomorrow);
    }

    // Day after tomorrow
    if (lowerText.includes('day after tomorrow')) {
        const date = new Date(today);
        date.setDate(date.getDate() + 2);
        return formatDate(date);
    }

    // Next week
    if (lowerText === 'next week') {
        const date = new Date(today);
        date.setDate(date.getDate() + 7);
        return formatDate(date);
    }

    // Next [day of week]
    const dayMatch = lowerText.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
    if (dayMatch) {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = dayNames.indexOf(dayMatch[1].toLowerCase());
        const currentDay = today.getDay();
        let daysUntil = targetDay - currentDay;
        if (daysUntil <= 0) daysUntil += 7;
        daysUntil += 7; // "next" means the following week

        const date = new Date(today);
        date.setDate(date.getDate() + daysUntil);
        return formatDate(date);
    }

    // This [day of week]
    const thisDayMatch = lowerText.match(/this\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
    if (thisDayMatch) {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = dayNames.indexOf(thisDayMatch[1].toLowerCase());
        const currentDay = today.getDay();
        let daysUntil = targetDay - currentDay;
        if (daysUntil <= 0) daysUntil += 7;

        const date = new Date(today);
        date.setDate(date.getDate() + daysUntil);
        return formatDate(date);
    }

    // Month Day format (e.g., "Jan 20", "January 20th", "20 Jan")
    const monthDayMatch = lowerText.match(
        /(?:(\d{1,2})(?:st|nd|rd|th)?\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*(\d{1,2})?(?:st|nd|rd|th)?/i
    );

    if (monthDayMatch) {
        const monthNames = {
            jan: 0, january: 0,
            feb: 1, february: 1,
            mar: 2, march: 2,
            apr: 3, april: 3,
            may: 4,
            jun: 5, june: 5,
            jul: 6, july: 6,
            aug: 7, august: 7,
            sep: 8, september: 8,
            oct: 9, october: 9,
            nov: 10, november: 10,
            dec: 11, december: 11,
        };

        const month = monthNames[monthDayMatch[2].toLowerCase()];
        const day = parseInt(monthDayMatch[1] || monthDayMatch[3]);

        if (!isNaN(day) && month !== undefined) {
            let year = today.getFullYear();
            const date = new Date(year, month, day);

            // If the date is in the past, assume next year
            if (date < today) {
                date.setFullYear(year + 1);
            }

            return formatDate(date);
        }
    }

    // Try parsing as a standard date format
    const parsedDate = new Date(text);
    if (!isNaN(parsedDate.getTime())) {
        return formatDate(parsedDate);
    }

    // YYYY-MM-DD format
    const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        return isoMatch[0];
    }

    // MM/DD/YYYY or DD/MM/YYYY format
    const slashMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
        const [, first, second, year] = slashMatch;
        // Assume MM/DD/YYYY for US format
        const date = new Date(parseInt(year), parseInt(first) - 1, parseInt(second));
        if (!isNaN(date.getTime())) {
            return formatDate(date);
        }
    }

    return null;
}

/**
 * Parse natural language time expressions
 * @param {string} text - Text containing time
 * @returns {string|null} Time in HH:MM format or null
 */
function parseNaturalTime(text) {
    if (!text) return null;

    const lowerText = text.toLowerCase().trim();

    // Morning times
    if (lowerText === 'morning' || lowerText === 'in the morning') {
        return '09:00';
    }

    // Afternoon times
    if (lowerText === 'afternoon' || lowerText === 'in the afternoon') {
        return '14:00';
    }

    // Evening times
    if (lowerText === 'evening' || lowerText === 'in the evening') {
        return '17:00';
    }

    // Noon
    if (lowerText === 'noon' || lowerText === 'midday') {
        return '12:00';
    }

    // HH:MM AM/PM format
    const amPmMatch = lowerText.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (amPmMatch) {
        let hours = parseInt(amPmMatch[1]);
        const minutes = parseInt(amPmMatch[2] || '0');
        const isPm = amPmMatch[3].toLowerCase() === 'pm';

        if (isPm && hours !== 12) hours += 12;
        if (!isPm && hours === 12) hours = 0;

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    // Just hour with am/pm (e.g., "2pm", "10am")
    const simpleAmPmMatch = lowerText.match(/(\d{1,2})(am|pm)/i);
    if (simpleAmPmMatch) {
        let hours = parseInt(simpleAmPmMatch[1]);
        const isPm = simpleAmPmMatch[2].toLowerCase() === 'pm';

        if (isPm && hours !== 12) hours += 12;
        if (!isPm && hours === 12) hours = 0;

        return `${hours.toString().padStart(2, '0')}:00`;
    }

    // 24-hour format (HH:MM)
    const hourMinMatch = lowerText.match(/(\d{1,2}):(\d{2})/);
    if (hourMinMatch) {
        const hours = parseInt(hourMinMatch[1]);
        const minutes = parseInt(hourMinMatch[2]);
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
    }

    // Just a number (assume it's an hour)
    const justHour = lowerText.match(/^(\d{1,2})$/);
    if (justHour) {
        const hours = parseInt(justHour[1]);
        if (hours >= 8 && hours <= 18) {
            return `${hours.toString().padStart(2, '0')}:00`;
        }
    }

    return null;
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format date for display
 */
function formatDateForDisplay(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

/**
 * Format time for display
 */
function formatTimeForDisplay(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

// =============================================================================
// Appointment Flow Service Class
// =============================================================================

/**
 * AppointmentFlowService
 * Manages the conversational appointment booking flow
 */
class AppointmentFlowService {
    /**
     * Create booking state for a session
     * @param {Object} [existingData={}] - Pre-existing collected data
     * @returns {Object} Initial booking state
     */
    createBookingState(existingData = {}) {
        return {
            isActive: true,
            collectedFields: { ...existingData },
            currentField: null,
            isComplete: false,
            isConfirming: false,
            errorField: null,
            lastError: null,
            attempts: {},
        };
    }

    /**
     * Get list of missing required fields
     * @param {Object} collectedFields - Currently collected fields
     * @returns {string[]} Array of missing field names
     */
    getMissingFields(collectedFields) {
        return REQUIRED_FIELDS.filter((field) => {
            const value = collectedFields[field];
            return !value || (typeof value === 'string' && value.trim() === '');
        });
    }

    /**
     * Check if all required fields are collected
     * @param {Object} collectedFields - Currently collected fields
     * @returns {boolean}
     */
    isComplete(collectedFields) {
        return this.getMissingFields(collectedFields).length === 0;
    }

    /**
     * Get the next field to collect
     * @param {Object} collectedFields - Currently collected fields
     * @returns {{field: string, prompt: string} | null}
     */
    getNextField(collectedFields) {
        const missingFields = this.getMissingFields(collectedFields);

        if (missingFields.length === 0) {
            return null;
        }

        const nextField = missingFields[0];
        const config = FIELD_CONFIG[nextField];

        return {
            field: nextField,
            prompt: config.prompt,
        };
    }

    /**
     * Validate a field value
     * @param {string} fieldName - Field to validate
     * @param {*} value - Value to validate
     * @returns {{valid: boolean, error?: string}}
     */
    validateField(fieldName, value) {
        const config = FIELD_CONFIG[fieldName];
        if (!config || !config.validate) {
            return { valid: true };
        }
        return config.validate(value);
    }

    /**
     * Generate prompt for a specific field
     * @param {string} fieldName - Field name
     * @param {boolean} isRetry - Is this a retry after invalid input
     * @returns {string} Prompt text
     */
    generatePrompt(fieldName, isRetry = false) {
        const config = FIELD_CONFIG[fieldName];
        if (!config) {
            return "Could you please provide the missing information?";
        }
        return isRetry ? config.errorPrompt : config.prompt;
    }

    /**
     * Extract appointment details from a message using regex patterns
     * @param {string} message - User's message
     * @returns {Object} Extracted fields
     */
    extractWithPatterns(message) {
        const extracted = {};

        // Extract using regex patterns for each field
        for (const [fieldName, config] of Object.entries(FIELD_CONFIG)) {
            if (config.extractPatterns) {
                for (const pattern of config.extractPatterns) {
                    const match = message.match(pattern);
                    if (match && match[1]) {
                        extracted[fieldName] = match[1].trim();
                        break;
                    }
                }
            }
        }

        // Try to extract date
        const dateResult = parseNaturalDate(message);
        if (dateResult) {
            extracted.preferredDate = dateResult;
        }

        // Try to extract time
        const timeResult = parseNaturalTime(message);
        if (timeResult) {
            extracted.preferredTime = timeResult;
        }

        return extracted;
    }

    /**
     * Analyze message and extract appointment details using AI
     * @param {string} message - User's message
     * @param {Array} conversationHistory - Previous messages
     * @param {Object} collectedFields - Already collected fields
     * @returns {Promise<Object>} Extracted data and flags
     */
    async analyzeMessage(message, conversationHistory = [], collectedFields = {}) {
        // First try regex extraction
        const regexExtracted = this.extractWithPatterns(message);

        // Check for cancel/restart keywords without AI
        const lowerMessage = message.toLowerCase();
        const wantsToCancel = /\b(cancel|stop|nevermind|never mind|forget it|don't want)\b/i.test(lowerMessage);
        const wantsToRestart = /\b(restart|start over|begin again|reset)\b/i.test(lowerMessage);

        // Check for confirmation response
        let confirmation = null;
        if (/^(yes|yeah|yep|correct|right|confirm|that's right|looks good|perfect)/i.test(lowerMessage)) {
            confirmation = 'yes';
        } else if (/^(no|nope|wrong|incorrect|change|fix|not right)/i.test(lowerMessage)) {
            confirmation = 'no';
        }

        // If AI service is available, use it for more intelligent extraction
        if (geminiService.isAvailable()) {
            try {
                const contextStr = conversationHistory
                    .slice(-5)
                    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
                    .join('\n');

                const collectedStr = Object.entries(collectedFields)
                    .filter(([_, v]) => v)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(', ') || 'None';

                const prompt = EXTRACTION_PROMPT
                    .replace('{message}', message)
                    .replace('{context}', contextStr || 'No previous context')
                    .replace('{collected}', collectedStr);

                const response = await geminiService.generateResponse(prompt, [], {});

                // Parse AI response
                try {
                    // Clean up response - remove markdown code blocks if present
                    let cleanResponse = response
                        .replace(/```json\n?/g, '')
                        .replace(/```\n?/g, '')
                        .trim();

                    const aiExtracted = JSON.parse(cleanResponse);

                    // Merge AI extraction with regex results (regex takes precedence for dates/times)
                    const merged = {
                        ...aiExtracted,
                        ...regexExtracted, // Override with regex results
                        wantsToCancel: aiExtracted.wantsToCancel || wantsToCancel,
                        wantsToRestart: aiExtracted.wantsToRestart || wantsToRestart,
                        confirmation: aiExtracted.confirmation || confirmation,
                    };

                    logger.debug('AI extraction result:', merged);
                    return merged;
                } catch (parseError) {
                    logger.warn('Failed to parse AI extraction response:', parseError.message);
                }
            } catch (error) {
                logger.warn('AI extraction failed, using regex fallback:', error.message);
            }
        }

        // Fallback to regex-only extraction
        return {
            ...regexExtracted,
            wantsToCancel,
            wantsToRestart,
            confirmation,
        };
    }

    /**
     * Generate confirmation summary
     * @param {Object} collectedFields - All collected fields
     * @returns {string} Confirmation message
     */
    generateConfirmationMessage(collectedFields) {
        const dateDisplay = collectedFields.preferredDate
            ? formatDateForDisplay(collectedFields.preferredDate)
            : collectedFields.preferredDate;

        const timeDisplay = collectedFields.preferredTime
            ? formatTimeForDisplay(collectedFields.preferredTime)
            : collectedFields.preferredTime;

        return `Great! Let me confirm your appointment details:

📋 **Your Information:**
• **Name:** ${collectedFields.petOwnerName}
• **Pet's Name:** ${collectedFields.petName}
• **Phone:** ${collectedFields.phoneNumber}
• **Date:** ${dateDisplay}
• **Time:** ${timeDisplay}

Is this information correct? (Yes/No)`;
    }

    /**
     * Generate success message after booking
     * @param {Object} appointment - Created appointment
     * @returns {string} Success message
     */
    generateSuccessMessage(appointment) {
        const dateDisplay = formatDateForDisplay(appointment.preferredDate);
        const timeDisplay = formatTimeForDisplay(appointment.preferredTime);

        return `✅ **Appointment Booked Successfully!**

Your appointment has been scheduled:
• **Reference:** ${appointment.appointmentId}
• **Date:** ${dateDisplay}
• **Time:** ${timeDisplay}
• **Pet:** ${appointment.petName}

We'll contact you at ${appointment.phoneNumber} to confirm.

Is there anything else I can help you with?`;
    }

    /**
     * Process user message in appointment flow
     * @param {string} message - User's message
     * @param {Object} bookingState - Current booking state
     * @param {Array} conversationHistory - Previous messages
     * @returns {Promise<Object>} Updated state and response
     */
    async processMessage(message, bookingState, conversationHistory = []) {
        // Extract appointment details from message
        const extracted = await this.analyzeMessage(
            message,
            conversationHistory,
            bookingState.collectedFields
        );

        // Handle cancel request
        if (extracted.wantsToCancel) {
            return {
                state: { ...bookingState, isActive: false },
                response: "No problem! I've cancelled the appointment booking. Is there anything else I can help you with?",
                action: 'cancelled',
            };
        }

        // Handle restart request
        if (extracted.wantsToRestart) {
            return {
                state: this.createBookingState(),
                response: "Let's start fresh! I'll help you book a new appointment. What's your name?",
                action: 'restarted',
            };
        }

        // Handle confirmation response
        if (bookingState.isConfirming && extracted.confirmation) {
            if (extracted.confirmation === 'yes') {
                return {
                    state: { ...bookingState, isComplete: true },
                    response: null, // Will be handled by controller to create appointment
                    action: 'confirmed',
                };
            } else {
                // User wants to change something
                return {
                    state: { ...bookingState, isConfirming: false },
                    response: "Which detail would you like to change? (name, pet name, phone, date, or time)",
                    action: 'edit_requested',
                };
            }
        }

        // Update collected fields with extracted data
        const updatedFields = { ...bookingState.collectedFields };
        let hasNewData = false;
        let invalidField = null;
        let validationError = null;

        for (const field of REQUIRED_FIELDS) {
            if (extracted[field] && extracted[field] !== null) {
                // Validate the extracted value
                const validation = this.validateField(field, extracted[field]);

                if (validation.valid) {
                    updatedFields[field] = extracted[field];
                    hasNewData = true;
                } else {
                    invalidField = field;
                    validationError = validation.error;
                }
            }
        }

        // Check if we have all required fields
        const isComplete = this.isComplete(updatedFields);

        // Build response
        let response;
        let action = 'collecting';
        let newState = {
            ...bookingState,
            collectedFields: updatedFields,
        };

        if (isComplete) {
            // All fields collected, ask for confirmation
            newState.isConfirming = true;
            response = this.generateConfirmationMessage(updatedFields);
            action = 'confirming';
        } else if (invalidField) {
            // Invalid field, ask again
            response = this.generatePrompt(invalidField, true);
            newState.errorField = invalidField;
            newState.lastError = validationError;
        } else {
            // Need more fields
            const nextField = this.getNextField(updatedFields);
            if (nextField) {
                // If we got new data, acknowledge it before asking next question
                if (hasNewData) {
                    const acknowledgedFields = Object.entries(extracted)
                        .filter(([k, v]) => REQUIRED_FIELDS.includes(k) && v)
                        .map(([k, _]) => k);

                    const acknowledgment = this.getAcknowledgment(acknowledgedFields);
                    response = `${acknowledgment}\n\n${nextField.prompt}`;
                } else {
                    response = nextField.prompt;
                }
                newState.currentField = nextField.field;
            }
        }

        return { state: newState, response, action };
    }

    /**
     * Get acknowledgment text for collected fields
     */
    getAcknowledgment(fields) {
        if (fields.length === 0) return '';

        const acknowledgments = {
            petOwnerName: "Got it, thanks!",
            petName: "Great name!",
            phoneNumber: "Perfect, I have your number.",
            preferredDate: "That date works!",
            preferredTime: "Good time choice!",
        };

        if (fields.length >= 2) {
            return "Thanks for that information!";
        }

        return acknowledgments[fields[0]] || "Got it!";
    }
}

// =============================================================================
// Export
// =============================================================================

export const appointmentFlowService = new AppointmentFlowService();
export { parseNaturalDate, parseNaturalTime, formatDateForDisplay, formatTimeForDisplay };
export default appointmentFlowService;
