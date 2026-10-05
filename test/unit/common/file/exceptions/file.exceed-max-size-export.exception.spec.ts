import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { FileExceedMaxSizeExportException } from '@common/file/exceptions/file.exceed-max-size-export.exception';

describe('FileExceedMaxSizeExportException', () => {
    describe('constructor', () => {
        it('declares the file module contract for an exported file exceeding the max size', () => {
            const exception = new FileExceedMaxSizeExportException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.exceedMaxSizeExport,
                statusCodeKey:
                    EnumFileStatusCodeError[
                        EnumFileStatusCodeError.exceedMaxSizeExport
                    ],
                httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
                messagePath: 'file.error.exceedMaxSizeExport',
            });
        });
    });
});
