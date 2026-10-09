import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthJwtGuardMissingException } from '@modules/auth/exceptions/auth.jwt-guard-missing.exception';

describe('AuthJwtGuardMissingException', () => {
    describe('constructor', () => {
        it('declares the auth module contract for a request the JWT guard left without a payload', () => {
            const exception = new AuthJwtGuardMissingException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtGuardMissing,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtGuardMissing
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'auth.error.jwtGuardMissing',
            });
        });
    });
});
