import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { TermPolicyContentExistException } from '@modules/term-policy/exceptions/term-policy.content-exist.exception';

describe('TermPolicyContentExistException', () => {
    describe('constructor', () => {
        it('declares the term-policy module contract for content already present in a language', () => {
            const exception = new TermPolicyContentExistException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentExist,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.contentExist
                    ],
                httpStatus: HttpStatus.CONFLICT,
                messagePath: 'termPolicy.error.contentExist',
            });
        });
    });
});
