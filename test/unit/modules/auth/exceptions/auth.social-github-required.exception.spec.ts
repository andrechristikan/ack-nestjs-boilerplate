import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthSocialGithubRequiredException } from '@modules/auth/exceptions/auth.social-github-required.exception';

describe('AuthSocialGithubRequiredException', () => {
    describe('constructor', () => {
        it('declares the auth module contract for a missing GitHub sign-in header', () => {
            const exception = new AuthSocialGithubRequiredException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.socialGithubRequired,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.socialGithubRequired
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'auth.error.socialGithubRequired',
            });
        });
    });
});
