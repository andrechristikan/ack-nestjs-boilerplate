import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { HelperEncryptionSecretInvalidException } from '@common/helper/exceptions/helper.encryption-secret-invalid.exception';
import { EnumHelperStatusCodeError } from '@common/helper/enums/helper.status-code.enum';

describe('HelperEncryptionSecretInvalidException', () => {
    describe('constructor', () => {
        it('declares the helper module contract for an invalid encryption secret', () => {
            const exception = new HelperEncryptionSecretInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'helper',
                statusCode: EnumHelperStatusCodeError.encryptionSecretInvalid,
                statusCodeKey:
                    EnumHelperStatusCodeError[
                        EnumHelperStatusCodeError.encryptionSecretInvalid
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'helper.error.encryptionSecretInvalid',
            });
        });
    });
});
