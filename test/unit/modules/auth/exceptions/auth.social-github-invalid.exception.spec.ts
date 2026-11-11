import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthSocialGithubInvalidException } from '@modules/auth/exceptions/auth.social-github-invalid.exception';

describe('AuthSocialGithubInvalidException', () => {
    describe('constructor', () => {
        it('declares the auth module contract for a failed GitHub exchange', () => {
            const rawError = new Error('github exchange failed');

            const exception = new AuthSocialGithubInvalidException(rawError);

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.socialGithubInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.socialGithubInvalid
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'auth.error.socialGithubInvalid',
                rawError,
            });
        });
    });
});
