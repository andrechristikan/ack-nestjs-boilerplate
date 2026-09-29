import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyNotFoundException } from '@modules/policy/exceptions/policy.not-found.exception';

describe('PolicyNotFoundException', () => {
    describe('constructor', () => {
        it('declares the policy module contract for a missing policy', () => {
            const exception = new PolicyNotFoundException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'policy',
                statusCode: EnumPolicyStatusCodeError.notFound,
                statusCodeKey:
                    EnumPolicyStatusCodeError[
                        EnumPolicyStatusCodeError.notFound
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'policy.error.notFound',
            });
        });
    });
});
