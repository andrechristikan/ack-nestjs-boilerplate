import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserGuardMissingException } from '@modules/user/exceptions/user.guard-missing.exception';

describe('UserGuardMissingException', () => {
    describe('constructor', () => {
        it('declares the user module contract for a request the user guard left without a stored user', () => {
            const exception = new UserGuardMissingException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.guardMissing,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.guardMissing
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'user.error.guardMissing',
            });
        });
    });
});
