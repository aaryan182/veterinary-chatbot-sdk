import { HTTP_STATUS } from '../config/constants.js';

/**
 * Standard API response wrapper
 */
export class ApiResponse {
    /**
     * Create a success response
     * @param {object} data - Response data
     * @param {string} message - Success message
     * @param {object} meta - Additional metadata (pagination, etc.)
     */
    static success(data, message = 'Success', meta = null) {
        const response = {
            success: true,
            message,
            data,
        };

        if (meta) {
            response.meta = meta;
        }

        return response;
    }

    /**
     * Create an error response
     * @param {string} message - Error message
     * @param {string} code - Error code
     * @param {object} details - Error details
     */
    static error(message, code, details = null) {
        const response = {
            success: false,
            error: {
                code,
                message,
            },
        };

        if (details) {
            response.error.details = details;
        }

        return response;
    }

    /**
     * Create a paginated response
     * @param {Array} data - Array of items
     * @param {number} page - Current page
     * @param {number} limit - Items per page
     * @param {number} total - Total items
     */
    static paginated(data, page, limit, total) {
        const totalPages = Math.ceil(total / limit);

        return {
            success: true,
            data,
            meta: {
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                },
            },
        };
    }
}

/**
 * Send success response helper
 */
export const sendSuccess = (res, data, message = 'Success', statusCode = HTTP_STATUS.OK) => {
    return res.status(statusCode).json(ApiResponse.success(data, message));
};

/**
 * Send created response helper
 */
export const sendCreated = (res, data, message = 'Created successfully') => {
    return res.status(HTTP_STATUS.CREATED).json(ApiResponse.success(data, message));
};

/**
 * Send no content response helper
 */
export const sendNoContent = (res) => {
    return res.status(HTTP_STATUS.NO_CONTENT).send();
};

export default ApiResponse;
