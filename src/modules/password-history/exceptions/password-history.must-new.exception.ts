import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPasswordHistoryStatusCodeError } from '@modules/password-history/enums/password-history.status-code.enum';

/** @public */
export class PasswordHistoryMustNewException extends AppBaseException {
    readonly module = 'passwordHistory';
    readonly statusCode = EnumPasswordHistoryStatusCodeError.mustNew;
    readonly statusCodeKey =
        EnumPasswordHistoryStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.BAD_REQUEST;

    constructor(readonly period: number) {
        super('passwordHistory.error.mustNew', {
            messageProperties: { period },
        });
    }
}
