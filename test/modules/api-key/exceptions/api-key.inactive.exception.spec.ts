import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';
import { ApiKeyInactiveException } from '@modules/api-key/exceptions/api-key.inactive.exception';

describe('ApiKeyInactiveException', () => {
    describe('constructor', () => {
        it('declares the api-key module contract for an inactive key', () => {
            const exception = new ApiKeyInactiveException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.inactive,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.inactive
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'apiKey.error.inactive',
            });
        });
    });
});
