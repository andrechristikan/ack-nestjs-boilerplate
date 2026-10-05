import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumResponseStatusCodeError } from '@common/response/enums/response.status-code.enum';
import { ResponseSerializationException } from '@common/response/exceptions/response.serialization.exception';

describe('ResponseSerializationException', () => {
    describe('constructor', () => {
        it('declares the response module contract with no options', () => {
            const exception = new ResponseSerializationException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'response',
                statusCode: EnumResponseStatusCodeError.serialization,
                statusCodeKey:
                    EnumResponseStatusCodeError[
                        EnumResponseStatusCodeError.serialization
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'response.error.serialization',
            });
        });

        it('carries the rawError option when a schema validation failure is passed', () => {
            const rawError = [{ path: ['data'], message: 'Invalid' }];

            const exception = new ResponseSerializationException({
                rawError,
            });

            expect(exception.rawError).toBe(rawError);
        });
    });
});
