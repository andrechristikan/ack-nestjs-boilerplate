import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { RequestPayloadTooLargeException } from '@common/request/exceptions/request.payload-too-large.exception';

describe('RequestPayloadTooLargeException', () => {
    describe('constructor', () => {
        it('declares the request module contract for a body past its size limit', () => {
            const exception = new RequestPayloadTooLargeException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.payloadTooLarge,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.payloadTooLarge
                    ],
                httpStatus: HttpStatus.PAYLOAD_TOO_LARGE,
                messagePath: 'request.error.payloadTooLarge',
            });
        });
    });
});
