import { RequestStoreService } from '@common/request/services/request.store.service';
import { Workspace } from '@generated/prisma-client';
import { IUser } from '@modules/user/interfaces/user.interface';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import {
    WorkspaceMemberStoreKey,
    WorkspaceStoreKey,
} from '@modules/workspace/constants/workspace.constant';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

/**
 * Confirms the already-authenticated user (loaded by `UserGuard`, which must run before this guard)
 * is a member of the workspace resolved by `WorkspaceGuard`. Never re-fetches or re-authenticates.
 */
@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
    constructor(
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(_context: ExecutionContext): Promise<boolean> {
        const workspace = this.requestStoreService.get<Workspace>(
            WorkspaceStoreKey
        );
        const user = this.requestStoreService.get<IUser>(UserStoreKey);

        const member = await this.workspaceMemberService.validateWorkspaceMemberGuard(
            workspace?.id ?? null,
            user?.id ?? null
        );

        this.requestStoreService.set(WorkspaceMemberStoreKey, member);

        return true;
    }
}
