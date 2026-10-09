import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';

/**
 * Raised when the JWKS endpoint or a social identity provider (Google, Apple) cannot be reached; the provider error rides in `rawError`.
 * @public
 */
export class AuthProviderUnavailableException extends AppBaseException {
    readonly module = 'auth';
    readonly statusCode = EnumAuthStatusCodeError.providerUnavailable;
    readonly statusCodeKey = EnumAuthStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.SERVICE_UNAVAILABLE;

    constructor(rawError?: unknown) {
        super('auth.error.providerUnavailable', { rawError });
    }
}
