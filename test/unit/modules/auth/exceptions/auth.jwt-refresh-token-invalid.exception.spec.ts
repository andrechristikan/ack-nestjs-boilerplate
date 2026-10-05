import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthJwtRefreshTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-refresh-token-invalid.exception';

describe('AuthJwtRefreshTokenInvalidException', () => {
    describe('constructor', () => {
        it('declares the auth module contract for an invalid refresh token', () => {
            const rawError = new Error('signature mismatch');

            const exception = new AuthJwtRefreshTokenInvalidException(rawError);

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtRefreshTokenInvalid
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'auth.error.refreshTokenUnauthorized',
                rawError,
            });
        });

        it('accepts no raw error', () => {
            const exception = new AuthJwtRefreshTokenInvalidException();

            expect(exception.rawError).toBeUndefined();
        });
    });
});
