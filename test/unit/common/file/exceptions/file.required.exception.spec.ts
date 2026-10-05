import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { FileRequiredException } from '@common/file/exceptions/file.required.exception';

describe('FileRequiredException', () => {
    describe('constructor', () => {
        it('declares the file module contract for a missing or empty required file', () => {
            const exception = new FileRequiredException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.required,
                statusCodeKey:
                    EnumFileStatusCodeError[EnumFileStatusCodeError.required],
                httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
                messagePath: 'file.error.required',
            });
        });
    });
});
