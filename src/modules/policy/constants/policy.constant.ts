import { HttpStatus } from '@nestjs/common';
import { DocResponseError } from '@common/doc/decorators/doc.decorator';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';

export enum EnumPolicyConditionPlaceholder {
    userId = '${userId}',
    workspaceId = '${workspaceId}',
    projectId = '${projectId}',
}

/**
 * Route metadata key holding the `{ subject, action }` requirements `@PolicyProtected` declares.
 * @public
 */
export const PolicyRequiredMetaKey = 'PolicyRequiredMetaKey';

/**
 * Request-store key holding the single ability resolved for the request.
 * @public
 */
export const PolicyAbilityStoreKey = 'PolicyAbilityStore';

/**
 * Policy guard error kit for the policy decorators.
 * @public
 */
export const DocPolicyErrorResponses = {
    forbidden: DocResponseError(HttpStatus.FORBIDDEN, {
        statusCode: EnumPolicyStatusCodeError.forbidden,
        messagePath: 'policy.error.forbidden',
    }),
    predefinedNotFound: DocResponseError(HttpStatus.INTERNAL_SERVER_ERROR, {
        statusCode: EnumPolicyStatusCodeError.predefinedNotFound,
        messagePath: 'policy.error.predefinedNotFound',
    }),
} as const;
