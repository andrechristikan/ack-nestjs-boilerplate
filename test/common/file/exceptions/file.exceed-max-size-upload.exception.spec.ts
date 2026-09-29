import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { FileExceedMaxSizeUploadException } from '@common/file/exceptions/file.exceed-max-size-upload.exception';

describe('FileExceedMaxSizeUploadException', () => {
    describe('constructor', () => {
        it('declares the file module contract for an uploaded file exceeding the max size', () => {
            const exception = new FileExceedMaxSizeUploadException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.exceedMaxSizeUpload,
                statusCodeKey:
                    EnumFileStatusCodeError[
                        EnumFileStatusCodeError.exceedMaxSizeUpload
                    ],
                httpStatus: HttpStatus.PAYLOAD_TOO_LARGE,
                messagePath: 'file.error.exceedMaxSizeUpload',
            });
        });
    });
});
