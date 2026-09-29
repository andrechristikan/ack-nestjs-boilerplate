import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { TermPolicyContentEmptyException } from '@modules/term-policy/exceptions/term-policy.content-empty.exception';

describe('TermPolicyContentEmptyException', () => {
    describe('constructor', () => {
        it('declares the term-policy module contract for a term policy with no content', () => {
            const exception = new TermPolicyContentEmptyException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentEmpty,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.contentEmpty
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'termPolicy.error.contentEmpty',
            });
        });
    });
});
