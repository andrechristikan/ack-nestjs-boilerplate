import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import { UserContextStoreKey } from '@modules/user/constants/user.constant';
import type { IUserContext } from '@modules/user/interfaces/user.interface';
import {
    WorkspaceContextStoreKey,
    WorkspaceIdStoreKey,
    WorkspaceRoleMetaKey,
} from '@modules/workspace/constants/workspace.constant';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { UserGuardMissingException } from '@modules/user/exceptions/user.guard-missing.exception';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class WorkspaceGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const workspaceId = this.requestStoreService.get<string | null>(
            WorkspaceIdStoreKey
        );

        const userContext =
            this.requestStoreService.get<IUserContext>(UserContextStoreKey);
        const user = userContext?.user ?? null;
        if (user === null) {
            throw new UserGuardMissingException();
        }

        const requiredRoles = this.reflector.get<EnumWorkspaceMemberRole[]>(
            WorkspaceRoleMetaKey,
            context.getHandler()
        );
        const allowedRoles = requiredRoles ?? [];

        const workspaceContext =
            await this.workspaceMemberService.validateWorkspaceGuard(
                workspaceId,
                user.id,
                allowedRoles
            );

        this.requestStoreService.merge<IWorkspaceContext>(
            WorkspaceContextStoreKey,
            workspaceContext
        );

        return true;
    }
}
