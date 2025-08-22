import { HttpStatus } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from '@common/request/enums/request.status-code.enum';

/**
 * Custom exception class for request validation errors.
 * Thrown when request data fails validation rules.
 */
export class RequestValidationException extends Error {
    readonly httpStatus: HttpStatus = HttpStatus.UNPROCESSABLE_ENTITY;
    readonly statusCode: number = ENUM_REQUEST_STATUS_CODE_ERROR.VALIDATION;
    readonly errors: ValidationError[];

    /**
     * Creates a new request validation exception.
     *
     * @param errors - Array of validation errors from class-validator
     */
    constructor(errors: ValidationError[]) {
        super('request.error.validation');

        this.errors = errors;
    }
}
