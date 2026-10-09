import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';

/**
 * Raised when a guard or param decorator finds the store key of a guard it depends on empty.
 * @public
 */
export class RequestGuardMissingException extends AppBaseException {
    readonly module = 'request';
    readonly statusCode = EnumRequestStatusCodeError.guardMissing;
    readonly statusCodeKey = EnumRequestStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    constructor(storeKey: string) {
        super('request.error.guardMissing', {
            rawError: new AppUnknownException(
                null,
                `RequestGuardMissingException: no guard wrote "${storeKey}"`
            ),
        });
    }
}
