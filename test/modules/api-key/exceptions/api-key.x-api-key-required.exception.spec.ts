import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';
import { ApiKeyXApiKeyRequiredException } from '@modules/api-key/exceptions/api-key.x-api-key-required.exception';

describe('ApiKeyXApiKeyRequiredException', () => {
    describe('constructor', () => {
        it('declares the api-key module contract for a missing x-api-key header', () => {
            const exception = new ApiKeyXApiKeyRequiredException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.xApiKeyRequired,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.xApiKeyRequired
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'apiKey.error.xApiKey.required',
            });
        });
    });
});
