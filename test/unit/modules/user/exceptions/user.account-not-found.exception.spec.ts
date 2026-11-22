import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserAccountNotFoundException } from '@modules/user/exceptions/user.account-not-found.exception';

describe('UserAccountNotFoundException', () => {
    describe('constructor', () => {
        it('declares the user module contract for a valid token whose user no longer exists', () => {
            const exception = new UserAccountNotFoundException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.accountNotFound,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.accountNotFound
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'user.error.accountNotFound',
            });
        });
    });
});
