import { RequestStoreService } from '@common/request/services/request.store.service';
import type { Workspace } from '@generated/prisma-client/client';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import { UserGuardMissingException } from '@modules/user/exceptions/user.guard-missing.exception';
import {
    WorkspaceMemberStoreKey,
    WorkspaceStoreKey,
} from '@modules/workspace/constants/workspace.constant';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { WorkspaceGuardMissingException } from '@modules/workspace/exceptions/workspace.guard-missing.exception';
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
        const user = this.requestStoreService.get<IUser>(UserStoreKey);
        if (!user) {
            throw new UserGuardMissingException();
        }

        const workspace =
            this.requestStoreService.get<Workspace>(WorkspaceStoreKey);
        if (!workspace) {
            throw new WorkspaceGuardMissingException();
        }

        const member =
            await this.workspaceMemberDomain.validateWorkspaceMemberGuard(
                workspace.id,
                user.id
            );

        this.requestStoreService.set(WorkspaceMemberStoreKey, member);

        return true;
    }
}
