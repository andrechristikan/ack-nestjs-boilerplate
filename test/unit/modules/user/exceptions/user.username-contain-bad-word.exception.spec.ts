import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserUsernameContainBadWordException } from '@modules/user/exceptions/user.username-contain-bad-word.exception';

describe('UserUsernameContainBadWordException', () => {
    describe('constructor', () => {
        it('declares the user module contract for a username containing a blocked word', () => {
            const exception = new UserUsernameContainBadWordException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.usernameContainBadWord,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.usernameContainBadWord
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'user.error.usernameContainBadWord',
            });
        });
    });
});
