import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';

/**
 * Raised when the `x-api-key` header is malformed or its secret is wrong.
 * @public
 */
export class ApiKeyXApiKeyInvalidException extends AppBaseException {
    readonly module = 'apiKey';
    readonly statusCode = EnumApiKeyStatusCodeError.xApiKeyInvalid;
    readonly statusCodeKey = EnumApiKeyStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNAUTHORIZED;

    constructor() {
        super('apiKey.error.xApiKey.invalid');
    }
}
