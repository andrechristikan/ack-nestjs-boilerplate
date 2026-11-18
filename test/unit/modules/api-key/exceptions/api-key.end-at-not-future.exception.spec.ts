import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';
import { ApiKeyEndAtNotFutureException } from '@modules/api-key/exceptions/api-key.end-at-not-future.exception';

describe('ApiKeyEndAtNotFutureException', () => {
    describe('constructor', () => {
        it('declares the api-key module contract for a non-future end date', () => {
            const exception = new ApiKeyEndAtNotFutureException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.endAtNotFuture,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.endAtNotFuture
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'apiKey.error.endAtNotFuture',
            });
        });
    });
});
