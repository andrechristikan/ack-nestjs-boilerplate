import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';

describe('TermPolicyNotFoundException', () => {
    describe('constructor', () => {
        it('declares the term-policy module contract for a missing term policy', () => {
            const exception = new TermPolicyNotFoundException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.notFound,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.notFound
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'termPolicy.error.notFound',
            });
        });
    });
});
