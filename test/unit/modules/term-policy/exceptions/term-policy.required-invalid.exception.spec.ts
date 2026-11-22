import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { TermPolicyRequiredInvalidException } from '@modules/term-policy/exceptions/term-policy.required-invalid.exception';

describe('TermPolicyRequiredInvalidException', () => {
    describe('constructor', () => {
        it('declares the term-policy module contract for a missing required acceptance', () => {
            const exception = new TermPolicyRequiredInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.requiredInvalid,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.requiredInvalid
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'termPolicy.error.requiredInvalid',
            });
        });
    });
});
