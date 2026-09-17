import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumHelperStatusCodeError } from '@common/helper/enums/helper.status-code.enum';

/**
 * Raised when an encrypted payload is malformed, tampered with, or sealed under another key, purpose or context.
 * @public
 */
export class HelperDecryptFailedException extends AppBaseException {
    readonly module = 'helper';
    readonly statusCode = EnumHelperStatusCodeError.decryptFailed;
    readonly statusCodeKey = EnumHelperStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    constructor(rawError?: unknown) {
        super('helper.error.decryptFailed', { rawError });
    }
}
