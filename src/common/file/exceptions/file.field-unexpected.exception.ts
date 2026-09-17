import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';

/**
 * Raised when a file arrives under a multipart field the route does not accept.
 * @public
 */
export class FileFieldUnexpectedException extends AppBaseException {
    readonly module = 'file';
    readonly statusCode = EnumFileStatusCodeError.fieldUnexpected;
    readonly statusCodeKey = EnumFileStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

    constructor() {
        super('file.error.fieldUnexpected');
    }
}
