import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPasswordHistoryStatusCodeError } from '@modules/password-history/enums/password-history.status-code.enum';
import { PasswordHistoryMustNewException } from '@modules/password-history/exceptions/password-history.must-new.exception';

describe('PasswordHistoryMustNewException', () => {
    describe('constructor', () => {
        it('declares the password-history module contract for a password reused within the reuse period', () => {
            const period = 90;

            const exception = new PasswordHistoryMustNewException(period);

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'passwordHistory',
                statusCode: 52700,
                statusCodeKey: 'mustNew',
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'passwordHistory.error.mustNew',
                messageProperties: { period },
            });
            expect(exception.statusCode).toBe(
                EnumPasswordHistoryStatusCodeError.mustNew
            );
        });
    });
});
