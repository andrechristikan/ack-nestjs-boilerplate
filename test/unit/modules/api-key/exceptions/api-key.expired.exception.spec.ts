import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';
import { ApiKeyExpiredException } from '@modules/api-key/exceptions/api-key.expired.exception';

describe('ApiKeyExpiredException', () => {
    describe('constructor', () => {
        it('declares the api-key module contract for a key past its validity window', () => {
            const exception = new ApiKeyExpiredException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.expired,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.expired
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'apiKey.error.expired',
            });
        });
    });
});
