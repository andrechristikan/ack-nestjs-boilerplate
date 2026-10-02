import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import type { CanActivate, Type } from '@nestjs/common';
import {
    DocPolicyErrorResponses,
    PolicyAbilityChainByScope,
    PolicyAbilityScopeMetaKey,
    PolicyRequiredMetaKey,
} from '@modules/policy/constants/policy.constant';
import {
    EnumPolicyAbilityScope,
    EnumPolicyPlatformSubject,
} from '@modules/policy/enums/policy.enum';
import { PlatformAbilityGuard } from '@modules/policy/guards/policy.platform.ability.guard';
import { PlatformPolicyGuard } from '@modules/policy/guards/policy.platform.guard';
import { ProjectAbilityGuard } from '@modules/policy/guards/policy.project.ability.guard';
import { WorkspaceAbilityGuard } from '@modules/policy/guards/policy.workspace.ability.guard';
import type { IPolicyRequired } from '@modules/policy/interfaces/policy.interface';
import { DocProjectErrorResponses } from '@modules/project/constants/project.constant';
import { DocWorkspaceErrorResponses } from '@modules/workspace/constants/workspace.constant';

const PolicyAbilityGuardByScope: Record<
    EnumPolicyAbilityScope,
    Type<CanActivate>
> = {
    [EnumPolicyAbilityScope.platform]: PlatformAbilityGuard,
    [EnumPolicyAbilityScope.workspace]: WorkspaceAbilityGuard,
    [EnumPolicyAbilityScope.project]: ProjectAbilityGuard,
};

const PlatformPolicyDocBySubject: Partial<
    Record<EnumPolicyPlatformSubject, MethodDecorator>
> = {
    [EnumPolicyPlatformSubject.Workspace]: DocWorkspaceErrorResponses.notFound,
    [EnumPolicyPlatformSubject.Project]: DocProjectErrorResponses.notFound,
};

/**
 * Protects a route with the platform ability, requiring the caller to hold the given policies, and
 * documents the policy error kits. A `Workspace` or `Project` subject on a route that carries
 * `:workspaceId` / `:projectId` is judged as that record (soft-deleted included); every other
 * subject is judged by type. Chains `PlatformAbilityGuard`, then `PlatformPolicyGuard`. Sits at
 * the policy slot of `rules/http.md`.
 * @public
 */
export function PlatformPolicyProtected(
    ...requiredPolicies: IPolicyRequired<EnumPolicyPlatformSubject>[]
): MethodDecorator {
    const docs = requiredPolicies.flatMap(
        ({ subject }) => PlatformPolicyDocBySubject[subject] ?? []
    );

    return applyDecorators(
        UseGuards(PlatformAbilityGuard, PlatformPolicyGuard),
        SetMetadata(PolicyRequiredMetaKey, requiredPolicies),
        SetMetadata(PolicyAbilityScopeMetaKey, EnumPolicyAbilityScope.platform),
        DocPolicyErrorResponses.forbidden,
        DocPolicyErrorResponses.predefinedNotFound,
        ...docs
    );
}

/**
 * Builds every ability layer of the scope's chain and authorizes nothing. For routes that read
 * the composed ability but enforce no policy (`/permissions`, project list).
 * @public
 */
export function PolicyAbilityProtected(
    scope: EnumPolicyAbilityScope
): MethodDecorator {
    const guards = PolicyAbilityChainByScope[scope].map(
        layer => PolicyAbilityGuardByScope[layer]
    );

    return applyDecorators(UseGuards(...guards));
}
