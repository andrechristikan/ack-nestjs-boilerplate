import { HttpStatus } from '@nestjs/common';
import type { IAppBaseExceptionOptions } from '@app/interfaces/app.interface';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import type { IEffectivePermission } from '@modules/policy/interfaces/policy.interface';

/**
 * Raised when the caller lacks a policy the route requires. `metadata.missing` lists the
 * subject and actions the caller lacks; `metadata.reason` carries the denying rule's reason.
 * @public
 */
export class PolicyForbiddenException extends AppBaseException {
    readonly module = 'policy';
    readonly statusCode = EnumPolicyStatusCodeError.forbidden;
    readonly statusCodeKey = EnumPolicyStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.FORBIDDEN;

    constructor(details?: {
        reason?: string;
        missing?: IEffectivePermission[];
    }) {
        const metadata: Record<string, unknown> = {};
        if (details?.reason) {
            metadata.reason = details.reason;
        }
        if (details?.missing && details.missing.length > 0) {
            metadata.missing = details.missing;
        }

        const options: IAppBaseExceptionOptions | undefined =
            Object.keys(metadata).length > 0 ? { metadata } : undefined;

        super('policy.error.forbidden', options);
    }
}
