import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumProjectMemberRole,
    Project,
    WorkspaceMember,
} from '@generated/prisma-client';
import {
    ProjectRoleMetaKey,
    ProjectStoreKey,
    ProjectWorkspaceOwnerStoreKey,
} from '@modules/project/constants/project.constant';
import { ProjectService } from '@modules/project/services/project.service';
import { WorkspaceMemberStoreKey } from '@modules/workspace/constants/workspace.constant';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Enforces the roles declared by `@ProjectMemberProtected(...roles)` against the project resolved by
 * `ProjectGuard` and the workspace membership resolved by `WorkspaceMemberGuard`, both of which must
 * run before this guard. A workspace owner passes without a `ProjectMember` row, and that bypass is
 * published to the request context.
 */
@Injectable()
export class ProjectRoleGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly projectService: ProjectService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const allowedRoles =
            this.reflector.get<EnumProjectMemberRole[]>(
                ProjectRoleMetaKey,
                context.getHandler()
            ) ?? [];

        const project = this.requestStoreService.get<Project>(ProjectStoreKey);
        const workspaceMember = this.requestStoreService.get<WorkspaceMember>(
            WorkspaceMemberStoreKey
        );

        const isWorkspaceOwner =
            await this.projectService.validateProjectRoleGuard(
                project?.id ?? null,
                workspaceMember,
                allowedRoles
            );

        this.requestStoreService.set(
            ProjectWorkspaceOwnerStoreKey,
            isWorkspaceOwner
        );

        return true;
    }
}
