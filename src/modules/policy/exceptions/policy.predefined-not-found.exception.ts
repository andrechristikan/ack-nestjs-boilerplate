import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';

/**
 * Raised when a policy guard is declared without any policy.
 * @public
 */
export class PolicyPredefinedNotFoundException extends AppBaseException {
    readonly module = 'policy';
    readonly statusCode = EnumPolicyStatusCodeError.predefinedNotFound;
    readonly statusCodeKey = EnumPolicyStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    constructor() {
        super('policy.error.predefinedNotFound');
    }
}
