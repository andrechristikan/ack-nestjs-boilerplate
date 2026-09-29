import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumResponseStatusCodeError } from '@common/response/enums/response.status-code.enum';
import { ResponseFileDataInvalidException } from '@common/response/exceptions/response.file-data-invalid.exception';

describe('ResponseFileDataInvalidException', () => {
    describe('constructor', () => {
        it('declares the response module contract for an invalid file response payload', () => {
            const exception = new ResponseFileDataInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'response',
                statusCode: EnumResponseStatusCodeError.fileDataInvalid,
                statusCodeKey:
                    EnumResponseStatusCodeError[
                        EnumResponseStatusCodeError.fileDataInvalid
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'response.error.fileDataInvalid',
            });
        });
    });
});
