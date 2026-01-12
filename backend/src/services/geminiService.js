import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * @fileoverview Gemini AI Service for Veterinary Chatbot
 * Handles all AI-related operations including response generation,
 * appointment intent detection, and details extraction.
 */

// =============================================================================
// Configuration Constants
// =============================================================================

/**
 * AI Model Configuration
 */
const AI_CONFIG = {
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    temperature: 0.7,
    maxOutputTokens: 500,
    topP: 0.95,
    topK: 40,
};

/**
 * Safety settings for appropriate responses
 */
const SAFETY_SETTINGS = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
];

/**
 * Keywords that indicate appointment booking intent
 */
const APPOINTMENT_INTENT_KEYWORDS = [
    'book',
    'appointment',
    'schedule',
    'visit',
    'consultation',
    'checkup',
    'check-up',
    'check up',
    'see the vet',
    'see a vet',
    'see doctor',
    'bring my pet',
    'bring my dog',
    'bring my cat',
    'available times',
    'available slots',
    'when can i come',
    'when can i visit',
    'make an appointment',
    'book a visit',
    'schedule a visit',
    'veterinary visit',
    'vet appointment',
    'clinic visit',
    'need to see',
    'want to see',
    'can i come',
    'examination',
    'annual checkup',
];

/**
 * Veterinary-focused system prompt
 */
const VETERINARY_SYSTEM_PROMPT = `You are a helpful veterinary assistant chatbot for a professional veterinary clinic. Your primary purpose is to assist pet owners with their pet health-related questions and help them book appointments.

## YOUR CAPABILITIES:
You can ONLY answer questions and provide guidance related to:
- Pet care and general health advice
- Vaccination schedules and immunization information
- Pet nutrition, diet, and feeding recommendations
- Common pet illnesses, symptoms, and when to seek help
- Preventive care and wellness tips
- General veterinary advice and first aid
- Appointment booking assistance
- Information about common veterinary procedures

## IMPORTANT RULES:
1. If asked about non-veterinary topics (politics, technology, general knowledge, etc.), politely decline and redirect the conversation to pet health topics.
   Example: "I'm specialized in pet health topics only. Is there anything about your pet's health I can help you with?"

2. NEVER diagnose specific conditions. Always recommend consulting a veterinarian for proper diagnosis.
   Example: "These symptoms could indicate several conditions. I recommend scheduling an appointment for a proper examination."

3. For emergencies, always advise immediate veterinary care.
   Emergency signs: difficulty breathing, severe bleeding, unconsciousness, seizures, suspected poisoning.

4. Be conversational, friendly, empathetic, and helpful.

5. Keep responses concise (2-3 sentences maximum) unless a detailed explanation is specifically needed.

6. Use the pet's name when provided to personalize responses.

## APPOINTMENT BOOKING:
When users express interest in booking an appointment, guide them through providing:
1. Pet Owner's Name
2. Pet's Name
3. Phone Number (for confirmation)
4. Preferred Date and Time

Ask for these details one or two at a time to keep the conversation natural.

Example flow:
- User: "I'd like to book an appointment"
- You: "I'd be happy to help you schedule an appointment! Could you please tell me your name and your pet's name?"

## RESPONSE STYLE:
- Be warm and caring
- Show empathy for pet health concerns
- Use simple, easy-to-understand language
- Include relevant follow-up questions when appropriate
- Offer to help with appointment booking when medical attention seems needed`;

/**
 * Prompt for appointment intent detection
 */
const APPOINTMENT_INTENT_PROMPT = `Analyze the following user message and determine if the user is expressing intent to book, schedule, or make an appointment for their pet.

Consider these as appointment-related intents:
- Wanting to visit the clinic
- Asking about availability
- Wanting to schedule a checkup
- Expressing need to see a vet
- Asking how to book

User message: "{message}"

Respond with ONLY "true" or "false" (lowercase, no quotes or explanation).`;

/**
 * Prompt for extracting appointment details from conversation
 */
const EXTRACT_DETAILS_PROMPT = `Analyze the following conversation and extract any appointment-related information that the user has provided.

Conversation:
{conversation}

Extract and return a JSON object with the following fields (use null for fields not mentioned):
{
  "petOwnerName": "extracted name or null",
  "petName": "extracted pet name or null",
  "phoneNumber": "extracted phone number or null",
  "preferredDate": "extracted date in YYYY-MM-DD format or null",
  "preferredTime": "extracted time in HH:MM format or null",
  "petType": "dog, cat, bird, rabbit, or other - or null",
  "reasonForVisit": "brief description or null"
}

IMPORTANT: Return ONLY the JSON object, no additional text or markdown formatting.`;

// =============================================================================
// Gemini Service Class
// =============================================================================

/**
 * GeminiService class
 * Handles all interactions with Google's Gemini AI API
 */
class GeminiService {
    constructor() {
        /** @type {GoogleGenerativeAI|null} */
        this.genAI = null;

        /** @type {import('@google/generative-ai').GenerativeModel|null} */
        this.model = null;

        /** @type {import('@google/generative-ai').GenerativeModel|null} */
        this.intentModel = null;

        /** @type {boolean} */
        this.initialized = false;

        /** @type {string|null} */
        this.initError = null;
    }

    // ===========================================================================
    // Initialization
    // ===========================================================================

    /**
     * Initialize the Gemini AI client
     * @returns {boolean} True if initialization was successful
     */
    initialize() {
        const apiKey = process.env.GEMINI_API_KEY;

        // Check for API key
        if (!apiKey || apiKey === 'your_gemini_api_key_here') {
            this.initError = 'Gemini API key not configured';
            logger.warn('Gemini API key not configured. AI features will be disabled.');
            return false;
        }

        try {
            // Initialize the Google Generative AI client
            this.genAI = new GoogleGenerativeAI(apiKey);

            // Create the main model for chat responses
            this.model = this.genAI.getGenerativeModel({
                model: AI_CONFIG.model,
                generationConfig: {
                    temperature: AI_CONFIG.temperature,
                    maxOutputTokens: AI_CONFIG.maxOutputTokens,
                    topP: AI_CONFIG.topP,
                    topK: AI_CONFIG.topK,
                },
                safetySettings: SAFETY_SETTINGS,
            });

            // Create a separate model instance for intent detection (lower temperature for consistent results)
            this.intentModel = this.genAI.getGenerativeModel({
                model: AI_CONFIG.model,
                generationConfig: {
                    temperature: 0.1, // Low temperature for deterministic responses
                    maxOutputTokens: 50,
                },
                safetySettings: SAFETY_SETTINGS,
            });

            this.initialized = true;
            this.initError = null;
            logger.info(`Gemini AI service initialized successfully (model: ${AI_CONFIG.model})`);
            return true;
        } catch (error) {
            this.initError = error.message;
            logger.error('Failed to initialize Gemini AI:', error);
            return false;
        }
    }

    /**
     * Check if the service is available and initialized
     * @returns {boolean}
     */
    isAvailable() {
        return this.initialized && this.model !== null;
    }

    /**
     * Get initialization error message
     * @returns {string|null}
     */
    getInitError() {
        return this.initError;
    }

    // ===========================================================================
    // Response Generation
    // ===========================================================================

    /**
     * Generate an AI response for the user's message
     * 
     * @param {string} userMessage - The user's message
     * @param {Array<{role: string, content: string}>} conversationHistory - Previous messages
     * @param {Object} [context={}] - Additional context (petName, userName, etc.)
     * @returns {Promise<string>} The AI-generated response
     * @throws {ApiError} If AI service is unavailable or API call fails
     * 
     * @example
     * const response = await geminiService.generateResponse(
     *   "My dog is not eating",
     *   [{ role: 'user', content: 'Hello' }, { role: 'bot', content: 'Hi!' }],
     *   { petName: 'Buddy', userName: 'John' }
     * );
     */
    async generateResponse(userMessage, conversationHistory = [], context = {}) {
        // Ensure service is initialized
        if (!this.isAvailable()) {
            if (!this.initialize()) {
                throw ApiError.serviceError(
                    'AI service is currently unavailable. Please try again later.',
                    { reason: this.initError }
                );
            }
        }

        try {
            // Build the complete prompt
            const prompt = this._buildChatPrompt(userMessage, conversationHistory, context);

            logger.debug('Generating AI response', {
                messageLength: userMessage.length,
                historyLength: conversationHistory.length,
            });

            // Generate response
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Validate response
            if (!text || text.trim().length === 0) {
                logger.warn('Empty response received from Gemini API');
                return this._getFallbackResponse(userMessage, context);
            }

            logger.debug('AI response generated successfully', {
                responseLength: text.length
            });

            return text.trim();
        } catch (error) {
            return this._handleGenerationError(error, userMessage, context);
        }
    }

    /**
     * Build the complete chat prompt with system prompt and conversation history
     * @private
     */
    _buildChatPrompt(userMessage, conversationHistory, context) {
        const parts = [];

        // Add system prompt
        parts.push(VETERINARY_SYSTEM_PROMPT);

        // Add context if available
        const contextInfo = this._buildContextString(context);
        if (contextInfo) {
            parts.push(`\n\n## CURRENT USER CONTEXT:\n${contextInfo}`);
        }

        // Add conversation history (last 10 messages for context window management)
        const recentHistory = conversationHistory.slice(-10);
        if (recentHistory.length > 0) {
            parts.push('\n\n## CONVERSATION HISTORY:');
            recentHistory.forEach((msg) => {
                const role = msg.role === 'user' ? 'User' : 'Assistant';
                parts.push(`${role}: ${msg.content}`);
            });
        }

        // Add current message
        parts.push(`\n\n## CURRENT MESSAGE:\nUser: ${userMessage}`);
        parts.push('\n\n## YOUR RESPONSE:');

        return parts.join('\n');
    }

    /**
     * Build context string from provided context object
     * @private
     */
    _buildContextString(context) {
        const contextParts = [];

        if (context.userName) {
            contextParts.push(`- Pet Owner's Name: ${context.userName}`);
        }
        if (context.petName) {
            contextParts.push(`- Pet's Name: ${context.petName}`);
        }
        if (context.petType || context.species) {
            contextParts.push(`- Pet Type: ${context.petType || context.species}`);
        }
        if (context.petAge || context.age) {
            contextParts.push(`- Pet Age: ${context.petAge || context.age} years`);
        }
        if (context.petBreed || context.breed) {
            contextParts.push(`- Breed: ${context.petBreed || context.breed}`);
        }

        return contextParts.length > 0 ? contextParts.join('\n') : '';
    }

    /**
     * Handle errors during response generation
     * @private
     */
    _handleGenerationError(error, userMessage, context) {
        const errorMessage = error.message || 'Unknown error';

        // Log the error
        logger.error('Gemini API error:', {
            error: errorMessage,
            code: error.code,
            status: error.status,
        });

        // Handle specific error types
        if (errorMessage.includes('API key')) {
            this.initialized = false;
            this.initError = 'Invalid API key';
            throw ApiError.serviceError('AI service configuration error. Please contact support.');
        }

        if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
            logger.warn('API rate limit or quota exceeded');
            throw ApiError.serviceError(
                'Our AI service is experiencing high demand. Please try again in a moment.',
                { retryAfter: 60 }
            );
        }

        if (errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
            throw ApiError.serviceError(
                'Unable to connect to AI service. Please check your internet connection.',
                { retryable: true }
            );
        }

        if (errorMessage.includes('blocked') || errorMessage.includes('safety')) {
            logger.warn('Response blocked by safety filters');
            return this._getSafetyFallbackResponse();
        }

        // Return fallback response for other errors
        return this._getFallbackResponse(userMessage, context);
    }

    /**
     * Get a fallback response when AI is unavailable
     * @private
     */
    _getFallbackResponse(userMessage, context) {
        const petName = context.petName ? ` for ${context.petName}` : '';
        const lowerMessage = userMessage.toLowerCase();

        // Check for appointment intent
        if (this._containsAppointmentKeywords(lowerMessage)) {
            return `I'd be happy to help you schedule an appointment${petName}! ` +
                'Please provide your name, your pet\'s name, phone number, and your preferred date and time.';
        }

        // Check for emergency keywords
        if (this._containsEmergencyKeywords(lowerMessage)) {
            return `This sounds like it could be urgent. I recommend seeking immediate veterinary care${petName}. ` +
                'If this is an emergency, please contact your nearest emergency veterinary clinic right away.';
        }

        // Generic fallback
        return 'I\'m here to help with your pet health questions. ' +
            'However, I\'m having trouble processing your request right now. ' +
            'Please try again in a moment, or contact our clinic directly for immediate assistance.';
    }

    /**
     * Get a fallback response for safety-blocked content
     * @private
     */
    _getSafetyFallbackResponse() {
        return 'I\'m here to help with pet health questions and appointment scheduling. ' +
            'Is there something specific about your pet\'s health I can assist you with?';
    }

    /**
     * Check if message contains appointment-related keywords
     * @private
     */
    _containsAppointmentKeywords(message) {
        return APPOINTMENT_INTENT_KEYWORDS.some((keyword) => message.includes(keyword));
    }

    /**
     * Check if message contains emergency keywords
     * @private
     */
    _containsEmergencyKeywords(message) {
        const emergencyKeywords = [
            'emergency', 'urgent', 'dying', 'not breathing', 'unconscious',
            'bleeding', 'seizure', 'convulsion', 'poisoned', 'poison',
            'hit by car', 'accident', 'choking', 'collapse', 'collapsed',
        ];
        return emergencyKeywords.some((keyword) => message.includes(keyword));
    }

    // ===========================================================================
    // Appointment Intent Detection
    // ===========================================================================

    /**
     * Detect if the user's message indicates appointment booking intent
     * Uses both keyword matching and AI analysis
     * 
     * @param {string} userMessage - The user's message
     * @returns {Promise<boolean>} True if appointment intent is detected
     * 
     * @example
     * const wantsAppointment = await geminiService.detectAppointmentIntent(
     *   "I'd like to schedule a checkup for my dog"
     * );
     * // Returns: true
     */
    async detectAppointmentIntent(userMessage) {
        const lowerMessage = userMessage.toLowerCase();

        // Quick keyword check first (faster than API call)
        if (this._containsAppointmentKeywords(lowerMessage)) {
            logger.debug('Appointment intent detected via keyword match');
            return true;
        }

        // If no keywords found and AI is not available, return false
        if (!this.isAvailable()) {
            return false;
        }

        // Use AI for more nuanced detection
        try {
            const prompt = APPOINTMENT_INTENT_PROMPT.replace('{message}', userMessage);
            const result = await this.intentModel.generateContent(prompt);
            const response = await result.response;
            const text = response.text().trim().toLowerCase();

            const isAppointmentIntent = text === 'true';

            logger.debug('Appointment intent detection via AI', {
                message: userMessage.substring(0, 50),
                result: isAppointmentIntent,
            });

            return isAppointmentIntent;
        } catch (error) {
            logger.warn('Error in AI appointment detection, falling back to keyword match:', error.message);
            return false;
        }
    }

    // ===========================================================================
    // Appointment Details Extraction
    // ===========================================================================

    /**
     * Extract appointment details from conversation messages
     * 
     * @param {Array<{role: string, content: string}>} conversationMessages - Conversation history
     * @returns {Promise<Object>} Extracted appointment details
     * 
     * @example
     * const details = await geminiService.extractAppointmentDetails([
     *   { role: 'user', content: 'I want to book an appointment' },
     *   { role: 'bot', content: 'Sure! What is your name?' },
     *   { role: 'user', content: 'My name is John and my dog is Buddy' },
     * ]);
     * // Returns: { petOwnerName: 'John', petName: 'Buddy', ... }
     */
    async extractAppointmentDetails(conversationMessages) {
        // Default empty result
        const defaultResult = {
            petOwnerName: null,
            petName: null,
            phoneNumber: null,
            preferredDate: null,
            preferredTime: null,
            petType: null,
            reasonForVisit: null,
            complete: false,
        };

        // Check if AI is available
        if (!this.isAvailable()) {
            logger.warn('AI not available for detail extraction, using regex fallback');
            return this._extractDetailsWithRegex(conversationMessages);
        }

        try {
            // Format conversation for the prompt
            const conversationText = conversationMessages
                .slice(-15) // Last 15 messages for context
                .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
                .join('\n');

            const prompt = EXTRACT_DETAILS_PROMPT.replace('{conversation}', conversationText);

            const result = await this.intentModel.generateContent(prompt);
            const response = await result.response;
            let text = response.text().trim();

            // Clean up response (remove markdown code blocks if present)
            text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            // Parse JSON response
            const extracted = JSON.parse(text);

            // Validate and sanitize extracted data
            const sanitized = this._sanitizeExtractedDetails(extracted);

            // Check if we have all required fields
            sanitized.complete = !!(
                sanitized.petOwnerName &&
                sanitized.petName &&
                sanitized.phoneNumber &&
                sanitized.preferredDate &&
                sanitized.preferredTime
            );

            // Calculate what's missing
            sanitized.missingFields = [];
            if (!sanitized.petOwnerName) sanitized.missingFields.push('petOwnerName');
            if (!sanitized.petName) sanitized.missingFields.push('petName');
            if (!sanitized.phoneNumber) sanitized.missingFields.push('phoneNumber');
            if (!sanitized.preferredDate) sanitized.missingFields.push('preferredDate');
            if (!sanitized.preferredTime) sanitized.missingFields.push('preferredTime');

            logger.debug('Appointment details extracted', {
                complete: sanitized.complete,
                missingFields: sanitized.missingFields,
            });

            return sanitized;
        } catch (error) {
            logger.error('Error extracting appointment details:', error.message);
            return this._extractDetailsWithRegex(conversationMessages);
        }
    }

    /**
     * Sanitize and validate extracted appointment details
     * @private
     */
    _sanitizeExtractedDetails(extracted) {
        const result = {
            petOwnerName: null,
            petName: null,
            phoneNumber: null,
            preferredDate: null,
            preferredTime: null,
            petType: null,
            reasonForVisit: null,
        };

        // Validate petOwnerName (letters, spaces, hyphens, apostrophes)
        if (extracted.petOwnerName && typeof extracted.petOwnerName === 'string') {
            const name = extracted.petOwnerName.trim();
            if (/^[a-zA-Z\s\-']{2,100}$/.test(name)) {
                result.petOwnerName = name;
            }
        }

        // Validate petName
        if (extracted.petName && typeof extracted.petName === 'string') {
            const petName = extracted.petName.trim();
            if (petName.length >= 1 && petName.length <= 50) {
                result.petName = petName;
            }
        }

        // Validate phoneNumber (basic validation)
        if (extracted.phoneNumber && typeof extracted.phoneNumber === 'string') {
            const phone = extracted.phoneNumber.replace(/\s+/g, ' ').trim();
            if (/^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/.test(phone)) {
                result.phoneNumber = phone;
            }
        }

        // Validate preferredDate (YYYY-MM-DD format)
        if (extracted.preferredDate && typeof extracted.preferredDate === 'string') {
            const dateMatch = extracted.preferredDate.match(/\d{4}-\d{2}-\d{2}/);
            if (dateMatch) {
                const date = new Date(dateMatch[0]);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (!isNaN(date.getTime()) && date >= today) {
                    result.preferredDate = dateMatch[0];
                }
            }
        }

        // Validate preferredTime (HH:MM format)
        if (extracted.preferredTime && typeof extracted.preferredTime === 'string') {
            const timeMatch = extracted.preferredTime.match(/([01]?[0-9]|2[0-3]):[0-5][0-9]/);
            if (timeMatch) {
                result.preferredTime = timeMatch[0].padStart(5, '0');
            }
        }

        // Validate petType
        if (extracted.petType && typeof extracted.petType === 'string') {
            const petType = extracted.petType.toLowerCase().trim();
            if (['dog', 'cat', 'bird', 'rabbit', 'hamster', 'fish', 'reptile', 'other'].includes(petType)) {
                result.petType = petType;
            }
        }

        // Sanitize reasonForVisit
        if (extracted.reasonForVisit && typeof extracted.reasonForVisit === 'string') {
            const reason = extracted.reasonForVisit.trim();
            if (reason.length <= 500) {
                result.reasonForVisit = reason;
            }
        }

        return result;
    }

    /**
     * Fallback regex-based extraction when AI is unavailable
     * @private
     */
    _extractDetailsWithRegex(conversationMessages) {
        const result = {
            petOwnerName: null,
            petName: null,
            phoneNumber: null,
            preferredDate: null,
            preferredTime: null,
            petType: null,
            reasonForVisit: null,
            complete: false,
            missingFields: [],
        };

        // Combine all user messages
        const userText = conversationMessages
            .filter((msg) => msg.role === 'user')
            .map((msg) => msg.content)
            .join(' ');

        // Try to extract phone number
        const phoneMatch = userText.match(/[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}/);
        if (phoneMatch) {
            result.phoneNumber = phoneMatch[0];
        }

        // Try to extract date (various formats)
        const datePatterns = [
            /(\d{4}-\d{2}-\d{2})/, // YYYY-MM-DD
            /(\d{1,2}\/\d{1,2}\/\d{4})/, // MM/DD/YYYY
            /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})/i,
        ];
        for (const pattern of datePatterns) {
            const match = userText.match(pattern);
            if (match) {
                try {
                    const date = new Date(match[1]);
                    if (!isNaN(date.getTime())) {
                        result.preferredDate = date.toISOString().split('T')[0];
                        break;
                    }
                } catch (e) {
                    // Continue to next pattern
                }
            }
        }

        // Try to extract time
        const timeMatch = userText.match(/(\d{1,2}:\d{2})(?:\s*(?:am|pm))?/i);
        if (timeMatch) {
            result.preferredTime = timeMatch[1].padStart(5, '0');
        }

        // Try to extract pet type
        const petTypes = ['dog', 'cat', 'bird', 'rabbit', 'hamster', 'fish', 'reptile'];
        for (const type of petTypes) {
            if (userText.toLowerCase().includes(type)) {
                result.petType = type;
                break;
            }
        }

        // Calculate missing fields
        if (!result.petOwnerName) result.missingFields.push('petOwnerName');
        if (!result.petName) result.missingFields.push('petName');
        if (!result.phoneNumber) result.missingFields.push('phoneNumber');
        if (!result.preferredDate) result.missingFields.push('preferredDate');
        if (!result.preferredTime) result.missingFields.push('preferredTime');

        result.complete = result.missingFields.length === 0;

        return result;
    }

    // ===========================================================================
    // Utility Methods
    // ===========================================================================

    /**
     * Get the next appointment prompt based on missing fields
     * 
     * @param {string[]} missingFields - Array of missing field names
     * @returns {string} Prompt to ask for missing information
     */
    getNextAppointmentPrompt(missingFields) {
        if (!missingFields || missingFields.length === 0) {
            return 'I have all the information needed. Shall I confirm your appointment?';
        }

        const prompts = {
            petOwnerName: 'Could you please tell me your name?',
            petName: 'What is your pet\'s name?',
            phoneNumber: 'What phone number should we use to contact you?',
            preferredDate: 'What date would you prefer for your appointment?',
            preferredTime: 'What time works best for you?',
        };

        // Ask for first 2 missing fields at most
        const fieldsToAsk = missingFields.slice(0, 2);
        const questions = fieldsToAsk.map((field) => prompts[field]).filter(Boolean);

        if (questions.length === 1) {
            return questions[0];
        } else if (questions.length === 2) {
            return `${questions[0]} Also, ${questions[1].toLowerCase()}`;
        }

        return 'Could you please provide the remaining details for your appointment?';
    }

    /**
     * Generate a confirmation message for the extracted appointment details
     * 
     * @param {Object} details - Extracted appointment details
     * @returns {string} Confirmation message
     */
    generateAppointmentConfirmation(details) {
        const parts = [];

        parts.push('Let me confirm your appointment details:');

        if (details.petOwnerName) {
            parts.push(`• Name: ${details.petOwnerName}`);
        }
        if (details.petName) {
            parts.push(`• Pet: ${details.petName}${details.petType ? ` (${details.petType})` : ''}`);
        }
        if (details.phoneNumber) {
            parts.push(`• Phone: ${details.phoneNumber}`);
        }
        if (details.preferredDate) {
            const date = new Date(details.preferredDate);
            const formattedDate = date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
            parts.push(`• Date: ${formattedDate}`);
        }
        if (details.preferredTime) {
            parts.push(`• Time: ${details.preferredTime}`);
        }
        if (details.reasonForVisit) {
            parts.push(`• Reason: ${details.reasonForVisit}`);
        }

        parts.push('\nIs this information correct?');

        return parts.join('\n');
    }
}

// =============================================================================
// Export Singleton Instance
// =============================================================================

/**
 * Singleton instance of GeminiService
 * @type {GeminiService}
 */
export const geminiService = new GeminiService();

export default geminiService;

// Export configuration for testing
export { AI_CONFIG, APPOINTMENT_INTENT_KEYWORDS, VETERINARY_SYSTEM_PROMPT };
