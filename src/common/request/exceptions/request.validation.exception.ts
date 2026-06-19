import { HttpStatus } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';

/**
 * Carries class-validator errors to the global filter as a 422.
 */
export class RequestValidationException extends AppBaseException {
    readonly module = 'request';
    readonly statusCode = EnumRequestStatusCodeError.validation;
    readonly statusCodeKey = EnumRequestStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;
    readonly errors: ValidationError[];

    constructor(errors: ValidationError[]) {
        super('request.error.validation');

        this.errors = errors;
    }
}
