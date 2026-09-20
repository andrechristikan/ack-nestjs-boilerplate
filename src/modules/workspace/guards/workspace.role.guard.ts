import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import {
    WorkspaceMemberStoreKey,
    WorkspaceRoleMetaKey,
} from '@modules/workspace/constants/workspace.constant';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Enforces the roles declared by `@WorkspaceMemberProtected(...roles)` against the membership
 * resolved by `WorkspaceMemberGuard`, which must run before this guard.
 */
@Injectable()
export class WorkspaceRoleGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly workspaceMemberDomain: WorkspaceMemberDomain,
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

        this.workspaceMemberDomain.validateWorkspaceRoleGuard(
            member,
            allowedRoles
        );

        return true;
    }
}
