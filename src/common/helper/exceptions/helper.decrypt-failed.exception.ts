import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumHelperStatusCodeError } from '@common/helper/enums/helper.status-code.enum';

/** @public */
export class HelperDecryptFailedException extends AppBaseException {
    readonly module = 'helper';
    readonly statusCode = EnumHelperStatusCodeError.decryptFailed;
    readonly statusCodeKey = EnumHelperStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    constructor(readonly rawError: unknown = null) {
        super('helper.error.decryptFailed', { rawError });
    }
}
