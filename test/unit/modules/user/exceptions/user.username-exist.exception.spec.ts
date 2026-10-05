import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';

describe('UserUsernameExistException', () => {
    describe('constructor', () => {
        it('declares the user module contract for a username already taken', () => {
            const exception = new UserUsernameExistException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.usernameExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.usernameExist
                    ],
                httpStatus: HttpStatus.CONFLICT,
                messagePath: 'user.error.usernameExist',
            });
        });
    });
});
