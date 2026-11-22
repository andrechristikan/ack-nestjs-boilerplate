import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';
import { ApiKeyGuardMissingException } from '@modules/api-key/exceptions/api-key.guard-missing.exception';

describe('ApiKeyGuardMissingException', () => {
    describe('constructor', () => {
        it('declares the apiKey module contract for a request the API key guard left without a stored key', () => {
            const exception = new ApiKeyGuardMissingException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'apiKey',
                statusCode: EnumApiKeyStatusCodeError.guardMissing,
                statusCodeKey:
                    EnumApiKeyStatusCodeError[
                        EnumApiKeyStatusCodeError.guardMissing
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'apiKey.error.guardMissing',
            });
        });
    });
});
