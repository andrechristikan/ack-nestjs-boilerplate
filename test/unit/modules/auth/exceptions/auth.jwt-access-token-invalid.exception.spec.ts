import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';

describe('AuthJwtAccessTokenInvalidException', () => {
    describe('constructor', () => {
        it('declares the auth module contract for an invalid access token', () => {
            const rawError = new Error('signature mismatch');

            const exception = new AuthJwtAccessTokenInvalidException(rawError);

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtAccessTokenInvalid
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'auth.error.accessTokenUnauthorized',
                rawError,
            });
        });

        it('accepts no raw error', () => {
            const exception = new AuthJwtAccessTokenInvalidException();

            expect(exception.rawError).toBeUndefined();
        });
    });
});
