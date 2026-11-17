import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserStatusInvalidException } from '@modules/user/exceptions/user.status-invalid.exception';

describe('UserStatusInvalidException', () => {
    describe('constructor', () => {
        it('declares the user module contract', () => {
            const exception = new UserStatusInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: 51005,
                statusCodeKey: 'statusInvalid',
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'user.error.statusInvalid',
            });
            expect(EnumUserStatusCodeError[exception.statusCode]).toBe(
                'statusInvalid'
            );
        });
    });
});
