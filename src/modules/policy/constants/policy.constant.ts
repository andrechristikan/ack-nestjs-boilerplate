import { HttpStatus } from '@nestjs/common';
import { DocResponseError } from '@common/doc/decorators/doc.decorator';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';

export enum EnumPolicyConditionPlaceholder {
    userId = '${userId}',
    workspaceId = '${workspaceId}',
    workspaceMemberId = '${workspaceMemberId}',
    projectId = '${projectId}',
    projectMemberId = '${projectMemberId}',
}

/**
 * Route metadata key holding the policy abilities `@PolicyProtected` requires.
 * @public
 */
export const PolicyRequiredMetaKey = 'PolicyRequiredMetaKey';

/**
 * Request-store key holding the CASL ability built once per request from the composed policies.
 * @public
 */
export const PolicyAbilityStoreKey = 'PolicyAbilityStore';

/**
 * Policy guard error kit for `@PolicyProtected`.
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
