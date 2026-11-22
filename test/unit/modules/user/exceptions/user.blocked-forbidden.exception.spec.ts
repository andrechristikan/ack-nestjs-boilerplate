import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserBlockedForbiddenException } from '@modules/user/exceptions/user.blocked-forbidden.exception';

describe('UserBlockedForbiddenException', () => {
    describe('constructor', () => {
        it('declares the user module contract for a blocked user on a protected route', () => {
            const exception = new UserBlockedForbiddenException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.blockedForbidden,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.blockedForbidden
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'user.error.blocked',
            });
        });
    });
});
