import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserNotSelfException } from '@modules/user/exceptions/user.not-self.exception';

describe('UserNotSelfException', () => {
    describe('constructor', () => {
        it('declares the user module contract for an admin action targeting the caller own account', () => {
            const exception = new UserNotSelfException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notSelf,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notSelf],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'user.error.notSelf',
            });
        });
    });
});
