import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { FileMultipartInvalidException } from '@common/file/exceptions/file.multipart-invalid.exception';

describe('FileMultipartInvalidException', () => {
    describe('constructor', () => {
        it('declares the file module contract for a malformed multipart body', () => {
            const exception = new FileMultipartInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.multipartInvalid,
                statusCodeKey:
                    EnumFileStatusCodeError[
                        EnumFileStatusCodeError.multipartInvalid
                    ],
                httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
                messagePath: 'file.error.multipartInvalid',
            });
        });
    });
});
