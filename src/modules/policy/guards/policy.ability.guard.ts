import { Injectable } from '@nestjs/common';
import type { CanActivate } from '@nestjs/common';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { PolicyContextStoreKey } from '@modules/policy/constants/policy.constant';
import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import { ProjectContextStoreKey } from '@modules/project/constants/project.constant';
import type { IProjectContextPatch } from '@modules/project/interfaces/project.interface';
import { UserContextStoreKey } from '@modules/user/constants/user.constant';
import { UserGuardMissingException } from '@modules/user/exceptions/user.guard-missing.exception';
import type { IUserContext } from '@modules/user/interfaces/user.interface';
import { WorkspaceContextStoreKey } from '@modules/workspace/constants/workspace.constant';
import type { IWorkspaceContextPatch } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class PolicyAbilityGuard implements CanActivate {
    constructor(
        private readonly policyAbilityService: PolicyAbilityService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(): Promise<boolean> {
        const stored = this.requestStoreService.get<IPolicyContext>(
            PolicyContextStoreKey
        );
        if (stored !== null) {
            return true;
        }

        const userContext =
            this.requestStoreService.get<IUserContext>(UserContextStoreKey);
        if (userContext === null) {
            throw new UserGuardMissingException();
        }

        const workspacePatch =
            this.requestStoreService.get<IWorkspaceContextPatch>(
                WorkspaceContextStoreKey
            );
        const projectPatch = this.requestStoreService.get<IProjectContextPatch>(
            ProjectContextStoreKey
        );

        const workspaceId = workspacePatch?.workspaceId ?? null;
        const workspace = workspacePatch?.workspace ?? null;
        const workspaceMember = workspacePatch?.workspaceMember ?? null;
        const workspaceContext =
            workspaceId !== null &&
            workspace !== null &&
            workspaceMember !== null
                ? { workspaceId, workspace, workspaceMember }
                : null;

        const project = projectPatch?.project ?? null;
        const projectContext =
            project !== null
                ? {
                      project,
                      projectMember: projectPatch?.projectMember ?? null,
                  }
                : null;

        const ability = await this.policyAbilityService.createAbility(
            userContext,
            workspaceContext,
            projectContext
        );
        this.requestStoreService.set<IPolicyContext>(PolicyContextStoreKey, {
            ability,
        });

        return true;
    }
}
