/**
 * API Service
 * Handles all HTTP requests to the backend
 */

const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Custom error class for API errors
 */
class ApiRequestError extends Error {
    constructor(message, status, code) {
        super(message);
        this.name = 'ApiRequestError';
        this.status = status;
        this.code = code;
    }
}

/**
 * Make an HTTP request to the API
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data
 */
async function apiRequest(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers,
            },
        });

        clearTimeout(timeout);

        // Parse response
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const errorMessage = data.error?.message || data.message || `HTTP error ${response.status}`;
            const errorCode = data.error?.code || 'API_ERROR';
            throw new ApiRequestError(errorMessage, response.status, errorCode);
        }

        return data.data || data;
    } catch (error) {
        clearTimeout(timeout);

        if (error.name === 'AbortError') {
            throw new ApiRequestError('Request timeout. Please try again.', 408, 'TIMEOUT');
        }

        if (error instanceof ApiRequestError) {
            throw error;
        }

        // Network or other errors
        if (!navigator.onLine) {
            throw new ApiRequestError('No internet connection. Please check your network.', 0, 'OFFLINE');
        }

        throw new ApiRequestError(
            error.message || 'Something went wrong. Please try again.',
            0,
            'NETWORK_ERROR'
        );
    }
}

/**
 * Chat API endpoints
 */
export const chatApi = {
    /**
     * Send a message and get AI response
     * @param {string} baseUrl - API base URL
     * @param {string} sessionId - Session identifier
     * @param {string} message - User message
     * @param {Object} context - Optional context
     * @returns {Promise<Object>} Response with AI reply
     */
    async sendMessage(baseUrl, sessionId, message, context = {}) {
        const response = await apiRequest(`${baseUrl}/chat/message`, {
            method: 'POST',
            body: JSON.stringify({
                sessionId,
                message,
                context,
            }),
        });

        return {
            reply: response.reply,
            sessionId: response.sessionId,
            appointmentDetected: response.appointmentDetected || false,
            messageCount: response.messageCount,
        };
    },

    /**
     * Get conversation history
     * @param {string} baseUrl - API base URL
     * @param {string} sessionId - Session identifier
     * @param {number} limit - Maximum messages
     * @returns {Promise<Object>} Conversation history
     */
    async getHistory(baseUrl, sessionId, limit = 50) {
        return await apiRequest(
            `${baseUrl}/chat/history/${sessionId}?limit=${limit}`
        );
    },

    /**
     * Close a conversation
     * @param {string} baseUrl - API base URL
     * @param {string} sessionId - Session identifier
     * @returns {Promise<Object>} Close confirmation
     */
    async closeConversation(baseUrl, sessionId) {
        return await apiRequest(`${baseUrl}/chat/close/${sessionId}`, {
            method: 'POST',
        });
    },
};

/**
 * Appointment API endpoints
 */
export const appointmentApi = {
    /**
     * Create a new appointment
     * @param {string} baseUrl - API base URL
     * @param {Object} appointmentData - Appointment details
     * @returns {Promise<Object>} Created appointment
     */
    async createAppointment(baseUrl, appointmentData) {
        const response = await apiRequest(`${baseUrl}/appointments`, {
            method: 'POST',
            body: JSON.stringify(appointmentData),
        });
        return response.appointment;
    },

    /**
     * Get appointments for a session
     * @param {string} baseUrl - API base URL
     * @param {string} sessionId - Session identifier
     * @returns {Promise<Object>} Appointments list
     */
    async getAppointments(baseUrl, sessionId) {
        return await apiRequest(`${baseUrl}/appointments/${sessionId}`);
    },

    /**
     * Get appointment by ID
     * @param {string} baseUrl - API base URL
     * @param {string} appointmentId - Appointment identifier
     * @returns {Promise<Object>} Appointment details
     */
    async getAppointment(baseUrl, appointmentId) {
        return await apiRequest(`${baseUrl}/appointments/detail/${appointmentId}`);
    },

    /**
     * Update appointment status
     * @param {string} baseUrl - API base URL
     * @param {string} appointmentId - Appointment identifier
     * @param {string} status - New status
     * @param {string} reason - Optional reason for cancellation
     * @returns {Promise<Object>} Updated appointment
     */
    async updateStatus(baseUrl, appointmentId, status, reason = null) {
        return await apiRequest(`${baseUrl}/appointments/${appointmentId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status, reason }),
        });
    },
};

/**
 * Health check API
 */
export const healthApi = {
    /**
     * Check API health
     * @param {string} baseUrl - API base URL
     * @returns {Promise<Object>} Health status
     */
    async check(baseUrl) {
        return await apiRequest(`${baseUrl}/status`);
    },
};

export default { chatApi, appointmentApi, healthApi };
