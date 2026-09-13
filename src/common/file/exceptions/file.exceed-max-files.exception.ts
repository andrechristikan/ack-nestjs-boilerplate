import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';

export class FileExceedMaxFilesException extends AppBaseException {
    readonly module = 'file';
    readonly statusCode = EnumFileStatusCodeError.exceedMaxFiles;
    readonly statusCodeKey = EnumFileStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

    constructor() {
        super('file.error.exceedMaxFiles');
    }
}
