import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserNotAuthenticatedException } from '@modules/user/exceptions/user.not-authenticated.exception';

describe('UserNotAuthenticatedException', () => {
    describe('constructor', () => {
        it('declares the user module contract for a protected route with no authenticated user id', () => {
            const exception = new UserNotAuthenticatedException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notAuthenticated,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.notAuthenticated
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'user.error.notAuthenticated',
            });
        });
    });
});
