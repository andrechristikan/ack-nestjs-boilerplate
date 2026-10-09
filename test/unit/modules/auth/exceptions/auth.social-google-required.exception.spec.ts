import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthSocialGoogleRequiredException } from '@modules/auth/exceptions/auth.social-google-required.exception';

describe('AuthSocialGoogleRequiredException', () => {
    describe('constructor', () => {
        it('declares the auth module contract for a missing Google sign-in header', () => {
            const exception = new AuthSocialGoogleRequiredException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.socialGoogleRequired,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.socialGoogleRequired
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'auth.error.socialGoogleRequired',
            });
        });
    });
});
