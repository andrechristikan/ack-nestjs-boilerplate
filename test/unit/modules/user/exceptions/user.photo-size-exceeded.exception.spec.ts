import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserPhotoSizeExceededException } from '@modules/user/exceptions/user.photo-size-exceeded.exception';

describe('UserPhotoSizeExceededException', () => {
    describe('constructor', () => {
        it('declares the user module contract for a profile photo above the maximum size', () => {
            const exception = new UserPhotoSizeExceededException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.photoSizeExceeded,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.photoSizeExceeded
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'user.error.photoSizeExceeded',
            });
        });
    });
});
