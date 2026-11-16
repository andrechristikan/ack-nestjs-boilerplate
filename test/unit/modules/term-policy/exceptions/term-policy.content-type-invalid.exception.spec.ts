import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { TermPolicyContentTypeInvalidException } from '@modules/term-policy/exceptions/term-policy.content-type-invalid.exception';

describe('TermPolicyContentTypeInvalidException', () => {
    describe('constructor', () => {
        it('declares the term-policy module contract for a content that is not a text template', () => {
            const exception = new TermPolicyContentTypeInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentTypeInvalid,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.contentTypeInvalid
                    ],
                httpStatus: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                messagePath: 'termPolicy.error.contentTypeInvalid',
            });
        });
    });
});
