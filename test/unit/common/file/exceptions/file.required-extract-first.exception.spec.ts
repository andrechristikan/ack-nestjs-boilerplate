import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { FileRequiredExtractFirstException } from '@common/file/exceptions/file.required-extract-first.exception';

describe('FileRequiredExtractFirstException', () => {
    describe('constructor', () => {
        it('declares the file module contract for CSV validation receiving no extracted rows', () => {
            const exception = new FileRequiredExtractFirstException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.requiredExtractFirst,
                statusCodeKey:
                    EnumFileStatusCodeError[
                        EnumFileStatusCodeError.requiredExtractFirst
                    ],
                httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
                messagePath: 'file.error.requiredExtractFirst',
            });
        });
    });
});
