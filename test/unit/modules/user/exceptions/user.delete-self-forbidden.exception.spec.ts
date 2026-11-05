import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserDeleteSelfForbiddenException } from '@modules/user/exceptions/user.delete-self-forbidden.exception';

describe('UserDeleteSelfForbiddenException', () => {
    describe('constructor', () => {
        it('declares the user module contract for an administrator account deleting itself', () => {
            const exception = new UserDeleteSelfForbiddenException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.deleteSelfForbidden,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.deleteSelfForbidden
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'user.error.deleteSelfForbidden',
            });
        });
    });
});
