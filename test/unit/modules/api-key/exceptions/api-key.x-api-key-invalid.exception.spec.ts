import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';
import { ApiKeyXApiKeyInvalidException } from '@modules/api-key/exceptions/api-key.x-api-key-invalid.exception';

describe('ApiKeyXApiKeyInvalidException', () => {
    describe('constructor', () => {
        it('declares the api-key module contract for a malformed or wrong x-api-key header', () => {
            const exception = new ApiKeyXApiKeyInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.xApiKeyInvalid,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.xApiKeyInvalid
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'apiKey.error.xApiKey.invalid',
            });
        });
    });
});
