import { HttpStatus } from '@nestjs/common';
import { IMessageValidationImportErrorParam } from '@common/message/interfaces/message.interface';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';

/**
 * Carries per-row class-validator errors from a file import for the import filter to format.
 */
export class FileImportException extends Error {
    readonly httpStatus: HttpStatus = HttpStatus.UNPROCESSABLE_ENTITY;
    readonly statusCode: number = EnumRequestStatusCodeError.validation;
    readonly errors: IMessageValidationImportErrorParam[];

    constructor(errors: IMessageValidationImportErrorParam[]) {
        super('file.error.validationDto');

        this.errors = errors;
    }
}
