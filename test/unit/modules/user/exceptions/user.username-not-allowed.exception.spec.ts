import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserUsernameNotAllowedException } from '@modules/user/exceptions/user.username-not-allowed.exception';

describe('UserUsernameNotAllowedException', () => {
    describe('constructor', () => {
        it('declares the user module contract for a username breaking the allowed pattern', () => {
            const exception = new UserUsernameNotAllowedException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.usernameNotAllowed,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.usernameNotAllowed
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'user.error.usernameNotAllowed',
            });
        });
    });
});
