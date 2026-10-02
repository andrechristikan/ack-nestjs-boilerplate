import { HttpStatus } from '@nestjs/common';
import type { IAppBaseExceptionOptions } from '@app/interfaces/app.interface';
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

    constructor(reason?: string) {
        const options: IAppBaseExceptionOptions | undefined = reason
            ? { metadata: { reason } }
            : undefined;

        super('policy.error.forbidden', options);
    }
}
