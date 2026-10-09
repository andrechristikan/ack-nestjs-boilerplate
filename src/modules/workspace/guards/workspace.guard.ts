import { RequestWorkspaceIdStoreKey } from '@common/request/constants/request.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { WorkspaceStoreKey } from '@modules/workspace/constants/workspace.constant';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';

/**
 * Resolves the active, non-deleted workspace from the workspace id in the request store (set by
 * `RequestWorkspaceMiddleware`) and caches it for the guards stacked above this one.
 */
@Injectable()
export class WorkspaceGuard implements CanActivate {
    constructor(
        private readonly workspaceDomain: WorkspaceDomain,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(_context: ExecutionContext): Promise<boolean> {
        const workspaceId = this.requestStoreService.get<string>(
            RequestWorkspaceIdStoreKey
        );

        const workspace =
            await this.workspaceDomain.validateWorkspaceGuard(workspaceId);

        this.requestStoreService.set(WorkspaceStoreKey, workspace);

        return true;
    }
}
