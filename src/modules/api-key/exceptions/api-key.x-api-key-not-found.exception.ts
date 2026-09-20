import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';

/**
 * Raised when the `x-api-key` header names no active API key.
 * @public
 */
export class ApiKeyXApiKeyNotFoundException extends AppBaseException {
    readonly module = 'apiKey';
    readonly statusCode = EnumApiKeyStatusCodeError.xApiKeyNotFound;
    readonly statusCodeKey = EnumApiKeyStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.FORBIDDEN;

    constructor() {
        super('apiKey.error.xApiKey.notFound');
    }
}
