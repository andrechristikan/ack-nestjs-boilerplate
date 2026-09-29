import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { RequestTimeoutException } from '@common/request/exceptions/request.timeout.exception';

describe('RequestTimeoutException', () => {
    describe('constructor', () => {
        it('declares the request module contract for a request that ran past its timeout', () => {
            const exception = new RequestTimeoutException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.timeout,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.timeout
                    ],
                httpStatus: HttpStatus.REQUEST_TIMEOUT,
                messagePath: 'http.clientError.requestTimeOut',
            });
        });
    });
});
