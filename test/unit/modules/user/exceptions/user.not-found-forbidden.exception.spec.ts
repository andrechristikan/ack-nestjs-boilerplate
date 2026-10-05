import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserNotFoundForbiddenException } from '@modules/user/exceptions/user.not-found-forbidden.exception';

describe('UserNotFoundForbiddenException', () => {
    describe('constructor', () => {
        it('declares the user module contract for an authenticated user that no longer exists', () => {
            const exception = new UserNotFoundForbiddenException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFoundForbidden,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.notFoundForbidden
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'user.error.notFound',
            });
        });
    });
});
