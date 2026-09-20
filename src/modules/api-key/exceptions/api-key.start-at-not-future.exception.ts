import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';

/**
 * Raised when an API key start date is not in the future.
 * @public
 */
export class ApiKeyStartAtNotFutureException extends AppBaseException {
    readonly module = 'apiKey';
    readonly statusCode = EnumApiKeyStatusCodeError.startAtNotFuture;
    readonly statusCodeKey = EnumApiKeyStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.BAD_REQUEST;

    constructor() {
        super('apiKey.error.startAtNotFuture');
    }
}
