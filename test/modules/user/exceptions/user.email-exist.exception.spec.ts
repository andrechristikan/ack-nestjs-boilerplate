import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserEmailExistException } from '@modules/user/exceptions/user.email-exist.exception';

describe('UserEmailExistException', () => {
    describe('constructor', () => {
        it('declares the user module contract for an email already registered', () => {
            const exception = new UserEmailExistException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailExist,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.emailExist],
                httpStatus: HttpStatus.CONFLICT,
                messagePath: 'user.error.emailExist',
            });
        });
    });
});
