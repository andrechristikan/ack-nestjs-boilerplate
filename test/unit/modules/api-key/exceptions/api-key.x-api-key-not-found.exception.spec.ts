import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';
import { ApiKeyXApiKeyNotFoundException } from '@modules/api-key/exceptions/api-key.x-api-key-not-found.exception';

describe('ApiKeyXApiKeyNotFoundException', () => {
    describe('constructor', () => {
        it('declares the api-key module contract for an unresolved x-api-key header', () => {
            const exception = new ApiKeyXApiKeyNotFoundException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.xApiKeyNotFound,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.xApiKeyNotFound
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'apiKey.error.xApiKey.notFound',
            });
        });
    });
});
