import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { TermPolicyExistException } from '@modules/term-policy/exceptions/term-policy.exist.exception';

describe('TermPolicyExistException', () => {
    describe('constructor', () => {
        it('declares the term-policy module contract for a duplicate type and version', () => {
            const exception = new TermPolicyExistException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.exist,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.exist
                    ],
                httpStatus: HttpStatus.CONFLICT,
                messagePath: 'termPolicy.error.exist',
            });
        });
    });
});
