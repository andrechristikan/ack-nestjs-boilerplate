import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumProjectMemberRole } from '@generated/prisma-client/client';
import {
    ProjectContextStoreKey,
    ProjectRoleMetaKey,
} from '@modules/project/constants/project.constant';
import type { IProjectContext } from '@modules/project/interfaces/project.interface';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { WorkspaceContextStoreKey } from '@modules/workspace/constants/workspace.constant';
import { WorkspaceGuardMissingException } from '@modules/workspace/exceptions/workspace.guard-missing.exception';
import type { IWorkspaceContextPatch } from '@modules/workspace/interfaces/workspace.interface';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ProjectGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly projectMemberService: ProjectMemberService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<IRequestApp>();
        const projectId = request.params.projectId;

        const workspaceContext =
            this.requestStoreService.get<IWorkspaceContextPatch>(
                WorkspaceContextStoreKey
            );
        const workspace = workspaceContext?.workspace ?? null;
        const workspaceMember = workspaceContext?.workspaceMember ?? null;
        if (workspace === null || workspaceMember === null) {
            throw new WorkspaceGuardMissingException();
        }

        const requiredRoles = this.reflector.get<EnumProjectMemberRole[]>(
            ProjectRoleMetaKey,
            context.getHandler()
        );
        const allowedRoles = requiredRoles ?? [];

        const projectContext =
            await this.projectMemberService.validateProjectGuard(
                workspaceMember,
                projectId ?? null,
                allowedRoles
            );

        this.requestStoreService.merge<IProjectContext>(
            ProjectContextStoreKey,
            projectContext
        );

        return true;
    }
}
