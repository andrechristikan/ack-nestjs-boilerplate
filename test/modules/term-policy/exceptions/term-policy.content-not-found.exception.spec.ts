import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { TermPolicyContentNotFoundException } from '@modules/term-policy/exceptions/term-policy.content-not-found.exception';

describe('TermPolicyContentNotFoundException', () => {
    describe('constructor', () => {
        it('declares the term-policy module contract for content missing in a language', () => {
            const exception = new TermPolicyContentNotFoundException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentNotFound,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.contentNotFound
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'termPolicy.error.contentNotFound',
            });
        });
    });
});
