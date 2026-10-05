import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserImportUsernameExistException } from '@modules/user/exceptions/user.import-username-exist.exception';

describe('UserImportUsernameExistException', () => {
    describe('constructor', () => {
        it('declares the user module contract for imported usernames that already exist', () => {
            const usernames = 'alice, bob';

            const exception = new UserImportUsernameExistException(usernames);

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.importUsernameExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.importUsernameExist
                    ],
                httpStatus: HttpStatus.CONFLICT,
                messagePath: 'user.error.importUsernameExist',
                messageProperties: { usernames },
            });
        });
    });
});
