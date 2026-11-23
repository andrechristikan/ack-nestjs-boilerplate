import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPolicyInvalidRuleReason } from '@modules/policy/enums/policy.enum';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyInvalidRuleException } from '@modules/policy/exceptions/policy.invalid-rule.exception';

describe('PolicyInvalidRuleException', () => {
    describe('constructor', () => {
        it.each(Object.values(EnumPolicyInvalidRuleReason))(
            'declares the policy module contract and the %s message path',
            reason => {
                const exception = new PolicyInvalidRuleException(reason);

                expect(exception).toBeInstanceOf(AppBaseException);
                expect(exception).toMatchObject({
                    module: 'policy',
                    statusCode: EnumPolicyStatusCodeError.invalidRule,
                    statusCodeKey:
                        EnumPolicyStatusCodeError[
                            EnumPolicyStatusCodeError.invalidRule
                        ],
                    httpStatus: HttpStatus.BAD_REQUEST,
                    messagePath: `policy.error.invalidRule.${reason}`,
                    metadata: { reason },
                });
            }
        );
    });
});
