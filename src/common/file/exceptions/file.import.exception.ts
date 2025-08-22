import { HttpStatus } from '@nestjs/common';
import { IMessageValidationImportErrorParam } from '@common/message/interfaces/message.interface';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from '@common/request/enums/request.status-code.enum';

/**
 * Custom exception for file import validation errors.
 * Extends Error to provide structured validation error information for file import operations.
 */
export class FileImportException extends Error {
    readonly httpStatus: HttpStatus = HttpStatus.UNPROCESSABLE_ENTITY;
    readonly statusCode: number = ENUM_REQUEST_STATUS_CODE_ERROR.VALIDATION;
    readonly errors: IMessageValidationImportErrorParam[];

    constructor(errors: IMessageValidationImportErrorParam[]) {
        super('file.error.validationDto');

        this.errors = errors;
    }
}
