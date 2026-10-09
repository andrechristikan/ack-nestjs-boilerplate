import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthProviderUnavailableException } from '@modules/auth/exceptions/auth.provider-unavailable.exception';

describe('AuthProviderUnavailableException', () => {
    describe('constructor', () => {
        it('declares the auth module contract for an unreachable key or identity provider', () => {
            const cause = new Error('connect ECONNREFUSED');

            const exception = new AuthProviderUnavailableException(cause);

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.providerUnavailable,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.providerUnavailable
                    ],
                httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
                messagePath: 'auth.error.providerUnavailable',
                rawError: cause,
            });
        });
    });
});
