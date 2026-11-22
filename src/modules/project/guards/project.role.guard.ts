import { WorkspaceContextStoreKey } from '@modules/workspace/constants/workspace.constant';
import type { IWorkspaceContextPatch } from '@modules/workspace/interfaces/workspace.interface';
import type {
    IProjectContext,
    IProjectContextPatch,
} from '@modules/project/interfaces/project.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumProjectMemberRole } from '@generated/prisma-client/client';
import {
    ProjectContextStoreKey,
    ProjectRoleMetaKey,
} from '@modules/project/constants/project.constant';
import { ProjectGuardMissingException } from '@modules/project/exceptions/project.guard-missing.exception';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { WorkspaceMemberGuardMissingException } from '@modules/workspace/exceptions/workspace.member-guard-missing.exception';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ProjectRoleGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly projectMemberService: ProjectMemberService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles = this.reflector.get<EnumProjectMemberRole[]>(
            ProjectRoleMetaKey,
            context.getHandler()
        );
        const allowedRoles = requiredRoles ?? [];

        const projectContext =
            this.requestStoreService.get<IProjectContextPatch>(
                ProjectContextStoreKey
            );
        const project = projectContext?.project ?? null;
        if (project === null) {
            throw new ProjectGuardMissingException();
        }

        const workspaceContext =
            this.requestStoreService.get<IWorkspaceContextPatch>(
                WorkspaceContextStoreKey
            );
        const workspaceMember = workspaceContext?.workspaceMember ?? null;
        if (workspaceMember === null) {
            throw new WorkspaceMemberGuardMissingException();
        }

        const member = await this.projectMemberService.validateProjectRoleGuard(
            project.id,
            workspaceMember,
            allowedRoles
        );

        this.requestStoreService.merge<IProjectContext>(
            ProjectContextStoreKey,
            { projectMember: member }
        );

        return true;
    }
}
