import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyPredefinedNotFoundException } from '@modules/policy/exceptions/policy.predefined-not-found.exception';

describe('PolicyPredefinedNotFoundException', () => {
    describe('constructor', () => {
        it('declares the policy module contract for a guard declared with no policy', () => {
            const exception = new PolicyPredefinedNotFoundException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'policy',
                statusCode: EnumPolicyStatusCodeError.predefinedNotFound,
                statusCodeKey:
                    EnumPolicyStatusCodeError[
                        EnumPolicyStatusCodeError.predefinedNotFound
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'policy.error.predefinedNotFound',
            });
        });
    });
});
