import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { EnumPolicyRuleInvalidReason } from '@modules/policy/enums/policy.rule-invalid-reason.enum';

/**
 * Raised when a policy rule breaks a storage rule; the reason selects the message.
 * @public
 */
export class PolicyRuleInvalidException extends AppBaseException {
    readonly module = 'policy';
    readonly statusCode = EnumPolicyStatusCodeError.invalidRule;
    readonly statusCodeKey = EnumPolicyStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

    constructor(readonly reason: EnumPolicyRuleInvalidReason) {
        super(`policy.error.invalidRule.${reason}`);
    }
}
