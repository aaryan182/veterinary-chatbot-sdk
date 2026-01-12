import axios from 'axios';

/**
 * @fileoverview API Service for Veterinary Chatbot Widget
 * Handles all HTTP communication with the backend API
 */

// =============================================================================
// Configuration
// =============================================================================

/**
 * Get API configuration from environment or global config
 */
const getConfig = () => {
    // Check for global config first (set by widget embed)
    const globalConfig = typeof window !== 'undefined' ? window.VetChatbotConfig : null;

    return {
        baseURL: globalConfig?.apiBaseUrl ||
            import.meta.env?.VITE_API_BASE_URL ||
            '/api/v1',
        timeout: 30000, // 30 seconds
        retryAttempts: 1,
        retryDelay: 1000, // 1 second
    };
};

// =============================================================================
// Axios Instance
// =============================================================================

/**
 * Create configured axios instance
 */
const createApiClient = () => {
    const config = getConfig();

    const client = axios.create({
        baseURL: config.baseURL,
        timeout: config.timeout,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
    });

    // Request interceptor - add session ID and context
    client.interceptors.request.use(
        (requestConfig) => {
            // Add timestamp for debugging
            requestConfig.metadata = { startTime: Date.now() };

            // Log request in development
            if (import.meta.env?.DEV) {
                console.log(`[API] ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`);
            }

            return requestConfig;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    // Response interceptor - handle errors and logging
    client.interceptors.response.use(
        (response) => {
            // Log response time in development
            if (import.meta.env?.DEV && response.config.metadata) {
                const duration = Date.now() - response.config.metadata.startTime;
                console.log(`[API] Response: ${response.status} (${duration}ms)`);
            }

            return response;
        },
        async (error) => {
            const originalRequest = error.config;

            // Don't retry if already retried or not a retryable error
            if (originalRequest._retry || !isRetryableError(error)) {
                return Promise.reject(formatError(error));
            }

            // Retry logic
            if (originalRequest._retryCount === undefined) {
                originalRequest._retryCount = 0;
            }

            if (originalRequest._retryCount < config.retryAttempts) {
                originalRequest._retryCount += 1;
                originalRequest._retry = true;

                console.log(`[API] Retrying request (attempt ${originalRequest._retryCount})`);

                // Wait before retry
                await new Promise((resolve) => setTimeout(resolve, config.retryDelay));

                return client(originalRequest);
            }

            return Promise.reject(formatError(error));
        }
    );

    return client;
};

/**
 * Check if error is retryable
 * @param {Error} error - Axios error
 * @returns {boolean}
 */
const isRetryableError = (error) => {
    // Retry on network errors
    if (!error.response) {
        return true;
    }

    // Retry on 5xx errors (server errors)
    if (error.response.status >= 500) {
        return true;
    }

    // Retry on 429 (rate limit)
    if (error.response.status === 429) {
        return true;
    }

    return false;
};

/**
 * Format error for consistent handling
 * @param {Error} error - Axios error
 * @returns {Error} Formatted error
 */
const formatError = (error) => {
    let message = 'Something went wrong. Please try again.';
    let code = 'UNKNOWN_ERROR';
    let status = 0;

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        message = 'Request timed out. Please try again.';
        code = 'TIMEOUT';
        status = 408;
    } else if (!error.response) {
        // Network error
        if (!navigator.onLine) {
            message = 'No internet connection. Please check your network.';
            code = 'OFFLINE';
        } else {
            message = 'Unable to connect to server. Please try again.';
            code = 'NETWORK_ERROR';
        }
    } else {
        // Server responded with error
        status = error.response.status;
        const data = error.response.data;

        if (data?.error?.message) {
            message = data.error.message;
            code = data.error.code || `HTTP_${status}`;
        } else if (data?.message) {
            message = data.message;
            code = `HTTP_${status}`;
        } else {
            switch (status) {
                case 400:
                    message = 'Invalid request. Please check your input.';
                    code = 'BAD_REQUEST';
                    break;
                case 401:
                    message = 'Authentication required.';
                    code = 'UNAUTHORIZED';
                    break;
                case 403:
                    message = 'Access denied.';
                    code = 'FORBIDDEN';
                    break;
                case 404:
                    message = 'Resource not found.';
                    code = 'NOT_FOUND';
                    break;
                case 429:
                    message = 'Too many requests. Please wait a moment.';
                    code = 'RATE_LIMITED';
                    break;
                case 500:
                    message = 'Server error. Please try again later.';
                    code = 'SERVER_ERROR';
                    break;
                case 503:
                    message = 'Service temporarily unavailable.';
                    code = 'SERVICE_UNAVAILABLE';
                    break;
                default:
                    message = `Request failed (${status})`;
                    code = `HTTP_${status}`;
            }
        }
    }

    const formattedError = new Error(message);
    formattedError.code = code;
    formattedError.status = status;
    formattedError.originalError = error;

    return formattedError;
};

// Create singleton instance
let apiClient = null;

const getApiClient = () => {
    if (!apiClient) {
        apiClient = createApiClient();
    }
    return apiClient;
};

// =============================================================================
// Chat API Functions
// =============================================================================

/**
 * Send a message and get AI response
 * 
 * @param {string} sessionId - Session identifier
 * @param {string} message - User's message
 * @param {Object} [context={}] - Optional context
 * @param {string} [context.userId] - User ID
 * @param {string} [context.userName] - User name
 * @param {string} [context.petName] - Pet name
 * @param {string} [context.source] - Source identifier
 * @returns {Promise<{reply: string, sessionId: string, appointmentDetected: boolean, messageCount: number}>}
 */
export const sendMessage = async (sessionId, message, context = {}) => {
    const client = getApiClient();

    const response = await client.post('/chat/message', {
        sessionId,
        message,
        context,
    });

    return {
        reply: response.data.data.reply,
        sessionId: response.data.data.sessionId,
        appointmentDetected: response.data.data.appointmentDetected || false,
        messageCount: response.data.data.messageCount || 0,
    };
};

/**
 * Get conversation history for a session
 * 
 * @param {string} sessionId - Session identifier
 * @param {number} [limit=50] - Maximum messages to return
 * @returns {Promise<{messages: Array, totalMessages: number, hasMore: boolean}>}
 */
export const getHistory = async (sessionId, limit = 50) => {
    const client = getApiClient();

    const response = await client.get(`/chat/history/${sessionId}`, {
        params: { limit },
    });

    return {
        messages: response.data.data.messages || [],
        totalMessages: response.data.data.totalMessages || 0,
        hasMore: response.data.data.hasMore || false,
        conversation: response.data.data.conversation || {},
    };
};

/**
 * Close a conversation
 * 
 * @param {string} sessionId - Session identifier
 * @returns {Promise<{sessionId: string, status: string}>}
 */
export const closeConversation = async (sessionId) => {
    const client = getApiClient();

    const response = await client.post(`/chat/close/${sessionId}`);

    return {
        sessionId: response.data.data.sessionId,
        status: response.data.data.status,
    };
};

// =============================================================================
// Appointment API Functions
// =============================================================================

/**
 * Create a new appointment
 * 
 * @param {string} sessionId - Session identifier
 * @param {Object} appointmentData - Appointment details
 * @param {string} appointmentData.petOwnerName - Pet owner's name
 * @param {string} appointmentData.petName - Pet's name
 * @param {string} appointmentData.phoneNumber - Contact phone
 * @param {string} appointmentData.preferredDate - Preferred date (YYYY-MM-DD)
 * @param {string} appointmentData.preferredTime - Preferred time (HH:MM)
 * @param {string} [appointmentData.notes] - Optional notes
 * @returns {Promise<Object>} Created appointment
 */
export const createAppointment = async (sessionId, appointmentData) => {
    const client = getApiClient();

    const response = await client.post('/appointments', {
        sessionId,
        ...appointmentData,
    });

    return {
        appointment: response.data.data.appointment,
        message: response.data.message,
        hasConflict: response.data.data.hasConflict || false,
    };
};

/**
 * Get appointments for a session
 * 
 * @param {string} sessionId - Session identifier
 * @param {Object} [options={}] - Query options
 * @param {string} [options.status] - Filter by status
 * @param {number} [options.limit=10] - Maximum results
 * @returns {Promise<{appointments: Array, total: number}>}
 */
export const getAppointments = async (sessionId, options = {}) => {
    const client = getApiClient();

    const response = await client.get(`/appointments/${sessionId}`, {
        params: options,
    });

    return {
        appointments: response.data.data.appointments || [],
        total: response.data.data.total || 0,
    };
};

/**
 * Get appointment details by ID
 * 
 * @param {string} appointmentId - Appointment identifier
 * @returns {Promise<Object>} Appointment details
 */
export const getAppointmentById = async (appointmentId) => {
    const client = getApiClient();

    const response = await client.get(`/appointments/detail/${appointmentId}`);

    return response.data.data.appointment;
};

/**
 * Update appointment status
 * 
 * @param {string} appointmentId - Appointment identifier
 * @param {string} status - New status ('confirmed' or 'cancelled')
 * @param {string} [reason] - Reason for cancellation
 * @returns {Promise<Object>} Updated appointment
 */
export const updateAppointmentStatus = async (appointmentId, status, reason = null) => {
    const client = getApiClient();

    const response = await client.patch(`/appointments/${appointmentId}/status`, {
        status,
        reason,
    });

    return {
        appointment: response.data.data.appointment,
        message: response.data.message,
    };
};

// =============================================================================
// Health Check
// =============================================================================

/**
 * Check API health status
 * 
 * @returns {Promise<Object>} Health status
 */
export const checkHealth = async () => {
    const client = getApiClient();

    const response = await client.get('/status');

    return response.data.data;
};

// =============================================================================
// API Service Object Export
// =============================================================================

const apiService = {
    // Chat
    sendMessage,
    getHistory,
    closeConversation,

    // Appointments
    createAppointment,
    getAppointments,
    getAppointmentById,
    updateAppointmentStatus,

    // Health
    checkHealth,

    // Utilities
    getConfig,
    formatError,
};

export default apiService;
