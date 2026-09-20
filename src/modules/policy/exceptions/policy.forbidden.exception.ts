import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';

/**
 * Raised when the caller lacks a policy the route requires.
 * @public
 */
export class PolicyForbiddenException extends AppBaseException {
    readonly module = 'policy';
    readonly statusCode = EnumPolicyStatusCodeError.forbidden;
    readonly statusCodeKey = EnumPolicyStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.FORBIDDEN;

    constructor() {
        super('policy.error.forbidden');
    }
}
