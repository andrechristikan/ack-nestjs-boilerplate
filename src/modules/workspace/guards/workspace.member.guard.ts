import { RequestStoreService } from '@common/request/services/request.store.service';
import type { Workspace } from '@generated/prisma-client/client';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import {
    EnumPolicyConditionPlaceholder,
    PolicyAbilityStoreKey,
} from '@modules/policy/constants/policy.constant';
import type { IPolicyAbility } from '@modules/policy/interfaces/policy.interface';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import type { IUserWithoutPolicies } from '@modules/user/interfaces/user.interface';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import {
    WorkspaceMemberStoreKey,
    WorkspaceStoreKey,
} from '@modules/workspace/constants/workspace.constant';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';

/**
 * Confirms the already-authenticated user (loaded by `UserGuard`, which must run before this guard)
 * is a member of the workspace resolved by `WorkspaceGuard`, stores the membership with its role
 * (without policies), and merges the role's policies into the resolved request ability. Never
 * re-fetches or re-authenticates.
 */
@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
    constructor(
        private readonly workspaceMemberDomain: WorkspaceMemberDomain,
        private readonly policyAbilityFactory: PolicyAbilityFactory,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(_context: ExecutionContext): Promise<boolean> {
        const workspace =
            this.requestStoreService.get<Workspace>(WorkspaceStoreKey);
        const user =
            this.requestStoreService.get<IUserWithoutPolicies>(UserStoreKey);

        const {
            role: { policies, ...role },
            ...member
        } = await this.workspaceMemberDomain.validateWorkspaceMemberGuard(
            workspace?.id ?? null,
            user?.id ?? null
        );

        const previousAbility = this.requestStoreService.get<IPolicyAbility>(
            PolicyAbilityStoreKey
        );
        if (!previousAbility) {
            throw new RequestContextMissingException(PolicyAbilityStoreKey);
        }
        const ability = this.policyAbilityFactory.buildFromPolicies(policies, {
            [EnumPolicyConditionPlaceholder.userId]: user?.id,
            [EnumPolicyConditionPlaceholder.workspaceId]: workspace?.id,
            [EnumPolicyConditionPlaceholder.workspaceMemberId]: member.id,
        });
        this.requestStoreService.set(
            PolicyAbilityStoreKey,
            this.policyAbilityFactory.build([
                ...(previousAbility.rules ?? []),
                ...(ability.rules ?? []),
            ])
        );
        this.requestStoreService.set(WorkspaceMemberStoreKey, {
            ...member,
            role,
        });

        return true;
    }
}
