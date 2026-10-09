import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';

describe('RequestContextMissingException', () => {
    describe('constructor', () => {
        it('declares the request module contract for a missing context value', () => {
            const exception = new RequestContextMissingException(
                'RequestLogStore.ipAddress'
            );

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.contextMissing
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'request.error.contextMissing',
            });
        });

        it('carries the missing context key inside rawError', () => {
            const exception = new RequestContextMissingException(
                'RequestLogStore.ipAddress'
            );

            expect(exception.rawError).toBeInstanceOf(AppUnknownException);
            expect((exception.rawError as AppUnknownException).message).toBe(
                'RequestContextMissingException: no value for "RequestLogStore.ipAddress"'
            );
        });
    });
});
