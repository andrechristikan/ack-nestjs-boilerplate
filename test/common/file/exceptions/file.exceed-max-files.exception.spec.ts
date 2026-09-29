import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { FileExceedMaxFilesException } from '@common/file/exceptions/file.exceed-max-files.exception';

describe('FileExceedMaxFilesException', () => {
    describe('constructor', () => {
        it('declares the file module contract for a request uploading too many files', () => {
            const exception = new FileExceedMaxFilesException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.exceedMaxFiles,
                statusCodeKey:
                    EnumFileStatusCodeError[
                        EnumFileStatusCodeError.exceedMaxFiles
                    ],
                httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
                messagePath: 'file.error.exceedMaxFiles',
            });
        });
    });
});
