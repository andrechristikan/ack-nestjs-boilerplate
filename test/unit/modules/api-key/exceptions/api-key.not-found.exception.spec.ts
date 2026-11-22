import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';
import { ApiKeyNotFoundException } from '@modules/api-key/exceptions/api-key.not-found.exception';

describe('ApiKeyNotFoundException', () => {
    describe('constructor', () => {
        it('declares the api-key module contract for a missing api key', () => {
            const exception = new ApiKeyNotFoundException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.notFound,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.notFound
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'apiKey.error.notFound',
            });
        });
    });
});
