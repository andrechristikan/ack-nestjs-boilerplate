import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { IMessageValidationImportErrorParam } from '@common/message/interfaces/message.interface';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';

/**
 * Carries per-row class-validator errors from a file import for the import filter to format.
 */
export class FileImportException extends AppBaseException {
    readonly module = 'file';
    readonly statusCode = EnumRequestStatusCodeError.validation;
    readonly statusCodeKey = EnumRequestStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;
    readonly errors: IMessageValidationImportErrorParam[];

    constructor(errors: IMessageValidationImportErrorParam[]) {
        super('file.error.validationDto');

        this.errors = errors;
    }
}
