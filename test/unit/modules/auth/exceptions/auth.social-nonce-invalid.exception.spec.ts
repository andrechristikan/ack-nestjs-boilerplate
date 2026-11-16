import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthSocialNonceInvalidException } from '@modules/auth/exceptions/auth.social-nonce-invalid.exception';

describe('AuthSocialNonceInvalidException', () => {
    describe('constructor', () => {
        it('declares the auth module contract for a missing, expired, or used social nonce', () => {
            const exception = new AuthSocialNonceInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.socialNonceInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.socialNonceInvalid
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'auth.error.socialNonceInvalid',
            });
        });
    });
});
