/**
 * Shared constants for the Veterinary Chatbot SDK
 * Used by both frontend and backend packages
 */

/**
 * API configuration constants
 */
export const API = {
    VERSION: 'v1',
    DEFAULT_TIMEOUT: 30000,
    MAX_MESSAGE_LENGTH: 2000,
    MAX_CONVERSATION_HISTORY: 50,
};

/**
 * HTTP Status codes
 */
export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
};

/**
 * Error codes used across the application
 */
export const ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    INVALID_SESSION: 'INVALID_SESSION',
};

/**
 * Pet species options
 */
export const PET_SPECIES = ['dog', 'cat', 'bird', 'rabbit', 'other'];

/**
 * Message role options
 */
export const MESSAGE_ROLES = ['user', 'assistant', 'system'];

/**
 * Session status options
 */
export const SESSION_STATUS = ['active', 'closed', 'archived'];

/**
 * Widget configuration defaults
 */
export const WIDGET_DEFAULTS = {
    position: 'bottom-right',
    primaryColor: '#6366f1',
    title: 'Pet Health Assistant',
    containerId: 'veterinary-chatbot-widget',
};
