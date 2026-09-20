import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumHelperStatusCodeError } from '@common/helper/enums/helper.status-code.enum';

/**
 * Raised when the root secret handed to `HelperEncryptionService` is not canonical base64url of the required number of raw bytes.
 * @public
 */
export class HelperEncryptionSecretInvalidException extends AppBaseException {
    readonly module = 'helper';
    readonly statusCode = EnumHelperStatusCodeError.encryptionSecretInvalid;
    readonly statusCodeKey = EnumHelperStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    constructor() {
        super('helper.error.encryptionSecretInvalid');
    }
}
