import { ERROR_CODES, HTTP_STATUS } from '../config/constants.js';

/**
 * Custom API Error class for consistent error handling
 */
export class ApiError extends Error {
    /**
     * Create an API error
     * @param {number} statusCode - HTTP status code
     * @param {string} message - Error message
     * @param {string} code - Error code
     * @param {object} details - Additional error details
     */
    constructor(statusCode, message, code = ERROR_CODES.INTERNAL_ERROR, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Create a 400 Bad Request error
     */
    static badRequest(message, details = null) {
        return new ApiError(HTTP_STATUS.BAD_REQUEST, message, ERROR_CODES.VALIDATION_ERROR, details);
    }

    /**
     * Create a 401 Unauthorized error
     */
    static unauthorized(message = 'Unauthorized access') {
        return new ApiError(HTTP_STATUS.UNAUTHORIZED, message, ERROR_CODES.UNAUTHORIZED);
    }

    /**
     * Create a 403 Forbidden error
     */
    static forbidden(message = 'Access forbidden') {
        return new ApiError(HTTP_STATUS.FORBIDDEN, message, ERROR_CODES.FORBIDDEN);
    }

    /**
     * Create a 404 Not Found error
     */
    static notFound(message = 'Resource not found') {
        return new ApiError(HTTP_STATUS.NOT_FOUND, message, ERROR_CODES.NOT_FOUND);
    }

    /**
     * Create a 500 Internal Server error
     */
    static internal(message = 'Internal server error') {
        return new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, message, ERROR_CODES.INTERNAL_ERROR);
    }

    /**
     * Create a service error (AI, external API, etc.)
     */
    static serviceError(message, details = null) {
        return new ApiError(
            HTTP_STATUS.SERVICE_UNAVAILABLE,
            message,
            ERROR_CODES.AI_SERVICE_ERROR,
            details
        );
    }
}

export default ApiError;
