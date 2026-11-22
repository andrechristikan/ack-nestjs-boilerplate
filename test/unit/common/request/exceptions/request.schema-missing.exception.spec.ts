import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { RequestSchemaMissingException } from '@common/request/exceptions/request.schema-missing.exception';

describe('RequestSchemaMissingException', () => {
    describe('constructor', () => {
        it('declares the request module contract for a body with no schema attached', () => {
            const exception = new RequestSchemaMissingException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.schemaMissing,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.schemaMissing
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'request.error.schemaMissing',
            });
        });
    });
});
