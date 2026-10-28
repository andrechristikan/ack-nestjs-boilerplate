import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserPhotoKeyInvalidException } from '@modules/user/exceptions/user.photo-key-invalid.exception';

describe('UserPhotoKeyInvalidException', () => {
    describe('constructor', () => {
        it('declares the user module contract for a photo key outside the profile photo path', () => {
            const exception = new UserPhotoKeyInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.photoKeyInvalid,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.photoKeyInvalid
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'user.error.photoKeyInvalid',
            });
        });
    });
});
