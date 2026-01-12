import { validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError.js';

/**
 * Validation middleware
 * Validates request using express-validator and returns errors if any
 */
export const validate = (validations) => {
    return async (req, res, next) => {
        // Run all validations
        await Promise.all(validations.map((validation) => validation.run(req)));

        // Check for errors
        const errors = validationResult(req);

        if (errors.isEmpty()) {
            return next();
        }

        // Format validation errors
        const formattedErrors = errors.array().map((error) => ({
            field: error.path,
            message: error.msg,
            value: error.value,
        }));

        return next(ApiError.badRequest('Validation failed', formattedErrors));
    };
};

export default validate;
