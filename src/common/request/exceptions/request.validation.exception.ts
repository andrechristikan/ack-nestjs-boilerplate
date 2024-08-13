import { HttpStatus } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/enums/request.status-code.enum';

export class RequestValidationException extends Error {
    readonly httpStatus: HttpStatus = HttpStatus.UNPROCESSABLE_ENTITY;
    readonly statusCode: number = ENUM_REQUEST_STATUS_CODE_ERROR.VALIDATION;
    readonly errors: ValidationError[];

    constructor(errors: ValidationError[]) {
        super('request.validation');

        this.errors = errors;
    }
}
