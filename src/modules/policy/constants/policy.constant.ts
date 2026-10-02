import { HttpStatus } from '@nestjs/common';
import { DocResponseError } from '@common/doc/decorators/doc.decorator';
import { EnumPolicyAbilityScope } from '@modules/policy/enums/policy.enum';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';

export enum EnumPolicyConditionPlaceholder {
    userId = '${userId}',
    workspaceId = '${workspaceId}',
    projectId = '${projectId}',
}

/**
 * Route metadata key holding the `{ subject, action }` requirements `@PlatformPolicyProtected`, `@WorkspacePolicyProtected` and `@ProjectPolicyProtected` declare.
 * @public
 */
export const PolicyRequiredMetaKey = 'PolicyRequiredMetaKey';

/**
 * Request-store key holding the platform ability `PlatformAbilityGuard` built.
 * @public
 */
export const PlatformPolicyAbilityStoreKey = 'PlatformPolicyAbilityStore';

/**
 * Request-store key holding the workspace ability `WorkspaceAbilityGuard` built.
 * @public
 */
export const WorkspacePolicyAbilityStoreKey = 'WorkspacePolicyAbilityStore';

/**
 * Request-store key holding the project ability `ProjectAbilityGuard` built.
 * @public
 */
export const ProjectPolicyAbilityStoreKey = 'ProjectPolicyAbilityStore';

/**
 * Request-store key of the single-layer ability each scope owns; the one map every ability writer and reader resolves a key through.
 * @public
 */
export const PolicyAbilityStoreKeyByScope: Record<
    EnumPolicyAbilityScope,
    string
> = {
    [EnumPolicyAbilityScope.platform]: PlatformPolicyAbilityStoreKey,
    [EnumPolicyAbilityScope.workspace]: WorkspacePolicyAbilityStoreKey,
    [EnumPolicyAbilityScope.project]: ProjectPolicyAbilityStoreKey,
};

/**
 * Ordered ability layers each scope composes at check time: platform for `platform`; platform then
 * workspace for `workspace`; platform, workspace, then project for `project`. The one map
 * `PolicyAbilityProtected` and `PolicyDomain.requireComposedAbility` resolve a chain through.
 * @public
 */
export const PolicyAbilityChainByScope: Record<
    EnumPolicyAbilityScope,
    EnumPolicyAbilityScope[]
> = {
    [EnumPolicyAbilityScope.platform]: [EnumPolicyAbilityScope.platform],
    [EnumPolicyAbilityScope.workspace]: [
        EnumPolicyAbilityScope.platform,
        EnumPolicyAbilityScope.workspace,
    ],
    [EnumPolicyAbilityScope.project]: [
        EnumPolicyAbilityScope.platform,
        EnumPolicyAbilityScope.workspace,
        EnumPolicyAbilityScope.project,
    ],
};

/**
 * Route metadata key holding the `EnumPolicyAbilityScope` whose composed ability the scope's policy guard reads.
 * @public
 */
export const PolicyAbilityScopeMetaKey = 'PolicyAbilityScopeMetaKey';

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
