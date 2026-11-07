import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import {
    WorkspaceMemberStoreKey,
    WorkspaceRoleMetaKey,
} from '@modules/workspace/constants/workspace.constant';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceMemberGuardMissingException } from '@modules/workspace/exceptions/workspace.member-guard-missing.exception';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class WorkspaceRoleGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.get<EnumWorkspaceMemberRole[]>(
            WorkspaceRoleMetaKey,
            context.getHandler()
        );
        const allowedRoles = requiredRoles ?? [];

        const member = this.requestStoreService.get<WorkspaceMember>(
            WorkspaceMemberStoreKey
        );
        if (!member) {
            throw new WorkspaceMemberGuardMissingException();
        }

        this.workspaceMemberService.validateWorkspaceRoleGuard(
            member,
            allowedRoles
        );

        return true;
    }
}
