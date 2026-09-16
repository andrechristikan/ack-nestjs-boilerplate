import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

export class UserImportUsernameExistException extends AppBaseException {
    readonly module = 'user';
    readonly statusCode = EnumUserStatusCodeError.importUsernameExist;
    readonly statusCodeKey = EnumUserStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.CONFLICT;

    constructor(usernames: string) {
        super('user.error.importUsernameExist', {
            messageProperties: { usernames },
        });
    }
}
