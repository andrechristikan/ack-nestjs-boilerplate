import { HttpStatus } from '@nestjs/common';
import { DocResponseError } from '@common/doc/decorators/doc.decorator';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';

/**
 * Route metadata key holding the policy abilities `@PolicyProtected` requires.
 * @public
 */
export const PolicyRequiredMetaKey = 'PolicyRequiredMetaKey';

/**
 * Request-store key holding the caller's platform role policies, written by the user guard.
 * @public
 */
export const PolicyStoreKey = 'PolicyStore';

/**
 * Request-store key holding the policies of the caller's workspace role, written by the workspace member guard.
 * @public
 */
export const WorkspaceMemberPolicyStoreKey = 'WorkspaceMemberPolicyStore';

/**
 * Request-store key holding the policies of the caller's project role, written by the project member guard.
 * @public
 */
export const ProjectMemberPolicyStoreKey = 'ProjectMemberPolicyStore';

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
