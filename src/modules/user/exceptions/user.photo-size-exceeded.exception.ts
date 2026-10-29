import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

/**
 * Raised when a profile photo presign asks for a size above `user.photo.maxSizeInBytes`.
 * @public
 */
export class UserPhotoSizeExceededException extends AppBaseException {
    readonly module = 'user';
    readonly statusCode = EnumUserStatusCodeError.photoSizeExceeded;
    readonly statusCodeKey = EnumUserStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.BAD_REQUEST;

    constructor() {
        super('user.error.photoSizeExceeded');
    }
}
