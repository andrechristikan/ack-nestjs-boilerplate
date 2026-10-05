import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserImportEmailExistException } from '@modules/user/exceptions/user.import-email-exist.exception';

describe('UserImportEmailExistException', () => {
    describe('constructor', () => {
        it('declares the user module contract for imported emails that already exist', () => {
            const emails = 'a@example.com, b@example.com';

            const exception = new UserImportEmailExistException(emails);

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.importEmailExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.importEmailExist
                    ],
                httpStatus: HttpStatus.CONFLICT,
                messagePath: 'user.error.importEmailExist',
                messageProperties: { emails },
            });
        });
    });
});
