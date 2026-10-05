import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserEmailNotVerifiedException } from '@modules/user/exceptions/user.email-not-verified.exception';

describe('UserEmailNotVerifiedException', () => {
    describe('constructor', () => {
        it('declares the user module contract for an action needing a verified email', () => {
            const exception = new UserEmailNotVerifiedException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailNotVerified,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.emailNotVerified
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'user.error.emailNotVerified',
            });
        });
    });
});
