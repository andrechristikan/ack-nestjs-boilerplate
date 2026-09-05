import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';

export class AppUnknownException extends AppBaseException {
    readonly module = 'app';
    readonly statusCode = EnumAppStatusCodeError.unknown;
    readonly statusCodeKey = EnumAppStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    constructor(rawError: unknown) {
        super('http.serverError.internalServerError', { rawError });
    }
}
