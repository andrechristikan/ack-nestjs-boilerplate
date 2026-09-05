import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumWorkspaceMemberRole, WorkspaceMember } from '@generated/prisma-client';
import {
    WorkspaceMemberStoreKey,
    WorkspaceRoleMetaKey,
} from '@modules/workspace/constants/workspace.constant';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Enforces the roles declared by `@WorkspaceMemberProtected(...roles)` against the membership
 * resolved by `WorkspaceMemberGuard`, which must run before this guard.
 */
@Injectable()
export class WorkspaceRoleGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    canActivate(context: ExecutionContext): boolean {
        const allowedRoles =
            this.reflector.get<EnumWorkspaceMemberRole[]>(
                WorkspaceRoleMetaKey,
                context.getHandler()
            ) ?? [];

        const member = this.requestStoreService.get<WorkspaceMember>(
            WorkspaceMemberStoreKey
        );

        this.workspaceMemberService.validateWorkspaceRoleGuard(
            member,
            allowedRoles
        );

        return true;
    }
}
