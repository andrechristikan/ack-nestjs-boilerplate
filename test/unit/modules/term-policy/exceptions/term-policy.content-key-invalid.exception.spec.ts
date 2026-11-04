import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { TermPolicyContentKeyInvalidException } from '@modules/term-policy/exceptions/term-policy.content-key-invalid.exception';

describe('TermPolicyContentKeyInvalidException', () => {
    describe('constructor', () => {
        it('declares the term-policy module contract for a content key outside the policy storage path', () => {
            const exception = new TermPolicyContentKeyInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentKeyInvalid,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.contentKeyInvalid
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'termPolicy.error.contentKeyInvalid',
            });
        });
    });
});
