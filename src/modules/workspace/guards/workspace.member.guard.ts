import { RequestStoreService } from '@common/request/services/request.store.service';
import type { Workspace } from '@generated/prisma-client/client';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import {
    WorkspaceMemberStoreKey,
    WorkspaceStoreKey,
} from '@modules/workspace/constants/workspace.constant';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';

/**
 * Confirms the already-authenticated user (loaded by `UserGuard`, which must run before this guard)
 * is a member of the workspace resolved by `WorkspaceGuard`. Never re-fetches or re-authenticates.
 */
@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
    constructor(
        private readonly workspaceMemberDomain: WorkspaceMemberDomain,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(_context: ExecutionContext): Promise<boolean> {
        const workspace =
            this.requestStoreService.get<Workspace>(WorkspaceStoreKey);
        const user = this.requestStoreService.get<IUser>(UserStoreKey);

        const member =
            await this.workspaceMemberDomain.validateWorkspaceMemberGuard(
                workspace?.id ?? null,
                user?.id ?? null
            );

        this.requestStoreService.set(WorkspaceMemberStoreKey, member);

        return true;
    }
}
