import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserBlockedInvalidException } from '@modules/user/exceptions/user.blocked-invalid.exception';

describe('UserBlockedInvalidException', () => {
    describe('constructor', () => {
        it('declares the user module contract for an admin action on a blocked user', () => {
            const exception = new UserBlockedInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.blockedInvalid,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.blockedInvalid
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'user.error.blockedInvalid',
            });
        });
    });
});
