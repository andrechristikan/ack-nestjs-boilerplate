import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';

/**
 * Raised when a request carries no `x-api-key` header.
 * @public
 */
export class ApiKeyXApiKeyRequiredException extends AppBaseException {
    readonly module = 'apiKey';
    readonly statusCode = EnumApiKeyStatusCodeError.xApiKeyRequired;
    readonly statusCodeKey = EnumApiKeyStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNAUTHORIZED;

    constructor() {
        super('apiKey.error.xApiKey.required');
    }
}
