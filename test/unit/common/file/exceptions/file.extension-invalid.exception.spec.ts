import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { FileExtensionInvalidException } from '@common/file/exceptions/file.extension-invalid.exception';

describe('FileExtensionInvalidException', () => {
    describe('constructor', () => {
        it('declares the file module contract for an unaccepted extension', () => {
            const exception = new FileExtensionInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.extensionInvalid,
                statusCodeKey:
                    EnumFileStatusCodeError[
                        EnumFileStatusCodeError.extensionInvalid
                    ],
                httpStatus: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                messagePath: 'file.error.extensionInvalid',
            });
        });
    });
});
