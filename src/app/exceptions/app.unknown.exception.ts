import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';

/** @public */
export class AppUnknownException extends AppBaseException {
    readonly module = 'app';
    readonly statusCode = EnumAppStatusCodeError.unknown;
    readonly statusCodeKey = EnumAppStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    constructor(
        readonly rawError: unknown,
        readonly description: string | null = null
    ) {
        super('http.serverError.internalServerError', { rawError });

        if (description !== null) {
            this.message = description;
        }
    }
}
