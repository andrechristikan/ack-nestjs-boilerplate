import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';

/**
 * Raised when the requested policy does not exist.
 * @public
 */
export class PolicyNotFoundException extends AppBaseException {
    readonly module = 'policy';
    readonly statusCode = EnumPolicyStatusCodeError.notFound;
    readonly statusCodeKey = EnumPolicyStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.NOT_FOUND;

    constructor() {
        super('policy.error.notFound');
    }
}
