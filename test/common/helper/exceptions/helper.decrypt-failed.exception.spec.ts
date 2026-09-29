import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { HelperDecryptFailedException } from '@common/helper/exceptions/helper.decrypt-failed.exception';
import { EnumHelperStatusCodeError } from '@common/helper/enums/helper.status-code.enum';

describe('HelperDecryptFailedException', () => {
    describe('constructor', () => {
        it('declares the helper module contract for a decrypt failure', () => {
            const exception = new HelperDecryptFailedException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'helper',
                statusCode: EnumHelperStatusCodeError.decryptFailed,
                statusCodeKey:
                    EnumHelperStatusCodeError[
                        EnumHelperStatusCodeError.decryptFailed
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'helper.error.decryptFailed',
            });
        });

        it('keeps the wrapped cause in rawError', () => {
            const rawError = new Error('boom');

            const exception = new HelperDecryptFailedException(rawError);

            expect(exception.rawError).toBe(rawError);
        });

        it('leaves rawError undefined when no cause is given', () => {
            const exception = new HelperDecryptFailedException();

            expect(exception.rawError).toBeUndefined();
        });
    });
});
