import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { HelperPatternTokenMissingException } from '@common/helper/exceptions/helper.pattern-token-missing.exception';
import { EnumHelperStatusCodeError } from '@common/helper/enums/helper.status-code.enum';

describe('HelperPatternTokenMissingException', () => {
    describe('constructor', () => {
        it('declares the helper module contract for a missing pattern token', () => {
            const exception = new HelperPatternTokenMissingException('name');

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'helper',
                statusCode: EnumHelperStatusCodeError.patternTokenMissing,
                statusCodeKey:
                    EnumHelperStatusCodeError[
                        EnumHelperStatusCodeError.patternTokenMissing
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'helper.error.patternTokenMissing',
                messageProperties: { token: 'name' },
            });
        });
    });
});
