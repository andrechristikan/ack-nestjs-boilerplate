import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { FileExceedMaxDataExportException } from '@common/file/exceptions/file.exceed-max-data-export.exception';

describe('FileExceedMaxDataExportException', () => {
    describe('constructor', () => {
        it('declares the file module contract for an export exceeding the row cap', () => {
            const exception = new FileExceedMaxDataExportException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.exceedMaxDataExport,
                statusCodeKey:
                    EnumFileStatusCodeError[
                        EnumFileStatusCodeError.exceedMaxDataExport
                    ],
                httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
                messagePath: 'file.error.exceedMaxDataExport',
            });
        });
    });
});
