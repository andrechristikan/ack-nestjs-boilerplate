import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthSocialAppleRequiredException } from '@modules/auth/exceptions/auth.social-apple-required.exception';

describe('AuthSocialAppleRequiredException', () => {
    describe('constructor', () => {
        it('declares the auth module contract for a missing Apple sign-in header', () => {
            const exception = new AuthSocialAppleRequiredException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.socialAppleRequired,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.socialAppleRequired
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'auth.error.socialAppleRequired',
            });
        });
    });
});
