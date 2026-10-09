import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumProjectMemberRole } from '@generated/prisma-client/client';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import {
    ProjectRoleMetaKey,
    ProjectStoreKey,
    ProjectWorkspaceOwnerStoreKey,
} from '@modules/project/constants/project.constant';
import { ProjectGuardMissingException } from '@modules/project/exceptions/project.guard-missing.exception';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { WorkspaceMemberStoreKey } from '@modules/workspace/constants/workspace.constant';
import { WorkspaceMemberGuardMissingException } from '@modules/workspace/exceptions/workspace.member-guard-missing.exception';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
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
        private readonly projectMemberDomain: ProjectMemberDomain,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles = this.reflector.get<EnumProjectMemberRole[]>(
            ProjectRoleMetaKey,
            context.getHandler()
        );
        const allowedRoles = requiredRoles ?? [];

        const project = this.requestStoreService.get<Project>(ProjectStoreKey);
        if (!project) {
            throw new ProjectGuardMissingException();
        }

        const workspaceMember = this.requestStoreService.get<WorkspaceMember>(
            WorkspaceMemberStoreKey
        );
        if (!workspaceMember) {
            throw new WorkspaceMemberGuardMissingException();
        }

        const isWorkspaceOwner =
            await this.projectMemberDomain.validateProjectRoleGuard(
                project.id,
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
