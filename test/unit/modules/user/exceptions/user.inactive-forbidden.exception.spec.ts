import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserInactiveForbiddenException } from '@modules/user/exceptions/user.inactive-forbidden.exception';

describe('UserInactiveForbiddenException', () => {
    describe('constructor', () => {
        it('declares the user module contract for an inactive account', () => {
            const exception = new UserInactiveForbiddenException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.inactiveForbidden,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.inactiveForbidden
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'user.error.inactive',
            });
        });
    });
});
