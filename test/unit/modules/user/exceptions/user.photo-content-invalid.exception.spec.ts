import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserPhotoContentInvalidException } from '@modules/user/exceptions/user.photo-content-invalid.exception';

describe('UserPhotoContentInvalidException', () => {
    describe('constructor', () => {
        it('declares the user module contract for a photo whose bytes are not its image type', () => {
            const exception = new UserPhotoContentInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.photoContentInvalid,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.photoContentInvalid
                    ],
                httpStatus: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                messagePath: 'user.error.photoContentInvalid',
            });
        });
    });
});
