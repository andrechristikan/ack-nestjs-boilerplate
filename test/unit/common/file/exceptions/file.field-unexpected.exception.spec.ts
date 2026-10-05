import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { FileFieldUnexpectedException } from '@common/file/exceptions/file.field-unexpected.exception';

describe('FileFieldUnexpectedException', () => {
    describe('constructor', () => {
        it('declares the file module contract for a file under an unaccepted multipart field', () => {
            const exception = new FileFieldUnexpectedException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.fieldUnexpected,
                statusCodeKey:
                    EnumFileStatusCodeError[
                        EnumFileStatusCodeError.fieldUnexpected
                    ],
                httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
                messagePath: 'file.error.fieldUnexpected',
            });
        });
    });
});
