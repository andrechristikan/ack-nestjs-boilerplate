import {
    RequestProjectStoreKey,
    RequestWorkspaceMemberStoreKey,
} from '@common/request/constants/request.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumProjectMemberRole } from '@generated/prisma-client/client';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import { ProjectRoleMetaKey } from '@modules/project/constants/project.constant';
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

        const project = this.requestStoreService.get<Project>(
            RequestProjectStoreKey
        );
        if (!project) {
            throw new ProjectGuardMissingException();
        }

        const workspaceMember = this.requestStoreService.get<WorkspaceMember>(
            RequestWorkspaceMemberStoreKey
        );
        if (!workspaceMember) {
            throw new WorkspaceMemberGuardMissingException();
        }

        await this.projectMemberService.validateProjectRoleGuard(
            project.id,
            workspaceMember,
            allowedRoles
        );

        return true;
    }
}
