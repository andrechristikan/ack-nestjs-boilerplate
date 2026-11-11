import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthSocialGithubNotConfiguredException } from '@modules/auth/exceptions/auth.social-github-not-configured.exception';

describe('AuthSocialGithubNotConfiguredException', () => {
    describe('constructor', () => {
        it('declares the auth module contract for GitHub sign-in that is not configured', () => {
            const exception = new AuthSocialGithubNotConfiguredException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.socialGithubNotConfigured,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.socialGithubNotConfigured
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'auth.error.socialGithubNotConfigured',
            });
        });
    });
});
