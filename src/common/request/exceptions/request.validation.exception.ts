import { HttpStatus } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';

/**
 * Carries class-validator errors to the global filter as a 422.
 */
export class RequestValidationException extends Error {
    readonly httpStatus: HttpStatus = HttpStatus.UNPROCESSABLE_ENTITY;
    readonly statusCode: number = EnumRequestStatusCodeError.validation;
    readonly errors: ValidationError[];

    constructor(errors: ValidationError[]) {
        super('request.error.validation');

        this.errors = errors;
    }
}
