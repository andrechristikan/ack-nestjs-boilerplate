import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserTokenInvalidException } from '@modules/user/exceptions/user.token-invalid.exception';

describe('UserTokenInvalidException', () => {
    describe('constructor', () => {
        it('declares the user module contract for an invalid or expired verification token', () => {
            const exception = new UserTokenInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.tokenInvalid,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.tokenInvalid
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'user.error.verificationTokenInvalid',
            });
        });
    });
});
