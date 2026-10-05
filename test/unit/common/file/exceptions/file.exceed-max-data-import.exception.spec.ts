import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { FileExceedMaxDataImportException } from '@common/file/exceptions/file.exceed-max-data-import.exception';

describe('FileExceedMaxDataImportException', () => {
    describe('constructor', () => {
        it('declares the file module contract for an import exceeding the row cap', () => {
            const exception = new FileExceedMaxDataImportException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.exceedMaxDataImport,
                statusCodeKey:
                    EnumFileStatusCodeError[
                        EnumFileStatusCodeError.exceedMaxDataImport
                    ],
                httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
                messagePath: 'file.error.exceedMaxDataImport',
            });
        });
    });
});
