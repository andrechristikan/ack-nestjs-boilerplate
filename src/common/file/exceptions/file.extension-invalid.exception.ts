import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';

export class FileExtensionInvalidException extends AppBaseException {
    readonly module = 'file';
    readonly statusCode = EnumFileStatusCodeError.extensionInvalid;
    readonly statusCodeKey = EnumFileStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNSUPPORTED_MEDIA_TYPE;

    constructor() {
        super('file.error.extensionInvalid');
    }
}
