import type { CanActivate } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import type { PolicyAbility } from '@modules/policy/interfaces/policy.interface';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import type { IUser } from '@modules/user/interfaces/user.interface';
import {
    ProjectMemberStoreKey,
    ProjectStoreKey,
} from '@modules/project/constants/project.constant';
import type { IProjectMemberWithRole } from '@modules/project/interfaces/project.interface';
import {
    WorkspaceMemberStoreKey,
    WorkspaceStoreKey,
} from '@modules/workspace/constants/workspace.constant';
import type { Workspace } from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import type { IWorkspaceMemberWithRole } from '@modules/workspace/interfaces/workspace.interface';

/** Resolves every role available in the current request into one reusable ability. */
@Injectable()
export class PolicyAbilityGuard implements CanActivate {
    constructor(
        private readonly policyAbilityDomain: PolicyAbilityDomain,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(): Promise<boolean> {
        const stored = this.requestStoreService.get<PolicyAbility>(
            PolicyAbilityStoreKey
        );
        if (stored !== null) {
            return true;
        }

        const user =
            this.policyAbilityDomain.requireStored<IUser>(UserStoreKey);
        const workspace =
            this.requestStoreService.get<Workspace>(WorkspaceStoreKey);
        const workspaceMember =
            this.requestStoreService.get<IWorkspaceMemberWithRole>(
                WorkspaceMemberStoreKey
            );
        const project = this.requestStoreService.get<Project>(ProjectStoreKey);
        const projectMember =
            this.requestStoreService.get<IProjectMemberWithRole>(
                ProjectMemberStoreKey
            );

        const ability = await this.policyAbilityDomain.buildAbility({
            user: { id: user.id, roleId: user.roleId },
            ...(workspace !== null && workspaceMember !== null
                ? {
                      workspace: {
                          id: workspace.id,
                          memberRoleId: workspaceMember.roleId,
                      },
                  }
                : {}),
            ...(project !== null
                ? {
                      project: {
                          id: project.id,
                          memberRoleId: projectMember?.roleId ?? null,
                      },
                  }
                : {}),
        });

        this.requestStoreService.set(PolicyAbilityStoreKey, ability);

        return true;
    }
}
