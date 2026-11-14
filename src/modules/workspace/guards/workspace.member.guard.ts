import { UserContextStoreKey } from '@modules/user/constants/user.constant';
import type { IUserContext } from '@modules/user/interfaces/user.interface';
import { WorkspaceContextStoreKey } from '@modules/workspace/constants/workspace.constant';
import type {
    IWorkspaceContext,
    IWorkspaceContextPatch,
} from '@modules/workspace/interfaces/workspace.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { UserGuardMissingException } from '@modules/user/exceptions/user.guard-missing.exception';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceGuardMissingException } from '@modules/workspace/exceptions/workspace.guard-missing.exception';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
    constructor(
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(_context: ExecutionContext): Promise<boolean> {
        const userContext =
            this.requestStoreService.get<IUserContext>(UserContextStoreKey);
        const user = userContext?.user ?? null;
        if (user === null) {
            throw new UserGuardMissingException();
        }

        const workspaceContext =
            this.requestStoreService.get<IWorkspaceContextPatch>(
                WorkspaceContextStoreKey
            );
        const workspace = workspaceContext?.workspace ?? null;
        if (workspace === null) {
            throw new WorkspaceGuardMissingException();
        }

        const member =
            await this.workspaceMemberService.validateWorkspaceMemberGuard(
                workspace.id,
                user.id
            );

        this.requestStoreService.merge<IWorkspaceContext>(
            WorkspaceContextStoreKey,
            { workspaceMember: member }
        );

        return true;
    }
}
