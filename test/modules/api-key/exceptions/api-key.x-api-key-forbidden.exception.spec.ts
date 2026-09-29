import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';
import { ApiKeyXApiKeyForbiddenException } from '@modules/api-key/exceptions/api-key.x-api-key-forbidden.exception';

describe('ApiKeyXApiKeyForbiddenException', () => {
    describe('constructor', () => {
        it('declares the api-key module contract for a disallowed api key type', () => {
            const exception = new ApiKeyXApiKeyForbiddenException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.xApiKeyForbidden,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.xApiKeyForbidden
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'apiKey.error.xApiKey.forbidden',
            });
        });
    });
});
