import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import type { IMessageValidationImportErrorParam } from '@common/message/interfaces/message.interface';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';

/** @public */
export class FileImportException extends AppBaseException {
    readonly module = 'file';
    readonly statusCode = EnumFileStatusCodeError.importInvalid;
    readonly statusCodeKey = EnumFileStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

    constructor(readonly errors: IMessageValidationImportErrorParam[]) {
        super('file.error.importInvalid');
    }
}
