import { Injectable } from '@nestjs/common';
import type { CanActivate } from '@nestjs/common';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { Workspace } from '@generated/prisma-client/client';
import { WorkspacePolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { EnumPolicyAbilityScope } from '@modules/policy/enums/policy.enum';
import type { PolicyAbility } from '@modules/policy/interfaces/policy.interface';
import {
    WorkspaceMemberStoreKey,
    WorkspaceStoreKey,
} from '@modules/workspace/constants/workspace.constant';
import type { IWorkspaceMemberWithRole } from '@modules/workspace/interfaces/workspace.interface';

/**
 * Builds the workspace layer ability from the acting workspace member's role rules only and
 * stores it under `WorkspacePolicyAbilityStoreKey`. It reads no other layer's ability, reuses an ability already
 * stored under its own key, and authorizes nothing.
 */
@Injectable()
export class WorkspaceAbilityGuard implements CanActivate {
    constructor(
        private readonly policyAbilityDomain: PolicyAbilityDomain,
        private readonly policyDomain: PolicyDomain,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(): Promise<boolean> {
        const stored = this.requestStoreService.get<PolicyAbility>(
            WorkspacePolicyAbilityStoreKey
        );
        if (stored !== null) {
            return true;
        }

        const workspace =
            this.policyDomain.requireStored<Workspace>(WorkspaceStoreKey);
        const member =
            this.policyDomain.requireStored<IWorkspaceMemberWithRole>(
                WorkspaceMemberStoreKey
            );

        const ability = await this.policyAbilityDomain.buildAbility({
            scope: EnumPolicyAbilityScope.workspace,
            workspace: { id: workspace.id, memberRoleId: member.roleId },
        });
        this.requestStoreService.set(WorkspacePolicyAbilityStoreKey, ability);

        return true;
    }
}
