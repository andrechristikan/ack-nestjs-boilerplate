import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPolicyInvalidRuleReason } from '@modules/policy/enums/policy.invalid-rule-reason.enum';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';

/**
 * Raised when an authored policy rule breaks the structural contract: a subject the role scope may not grant, a bad action list, or conditions on a non-model subject.
 * @public
 */
export class PolicyInvalidRuleException extends AppBaseException {
    readonly module = 'policy';
    readonly statusCode = EnumPolicyStatusCodeError.invalidRule;
    readonly statusCodeKey = EnumPolicyStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.BAD_REQUEST;

    constructor(reason: EnumPolicyInvalidRuleReason) {
        super(`policy.error.invalidRule.${reason}`);
    }
}
