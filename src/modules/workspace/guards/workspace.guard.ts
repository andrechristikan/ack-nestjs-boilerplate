import { RequestStoreService } from '@common/request/services/request.store.service';
import { WorkspaceStoreKey } from '@modules/workspace/constants/workspace.constant';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Resolves the active, non-deleted workspace from the `x-workspace-id` CLS store (set by
 * `RequestWorkspaceMiddleware`) and caches it for the guards stacked above this one.
 */
@Injectable()
export class WorkspaceGuard implements CanActivate {
    private readonly storeKey: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly workspaceDomain: WorkspaceDomain,
        private readonly requestStoreService: RequestStoreService
    ) {
        this.storeKey = this.configService.get<string>('workspace.storeKey')!;
    }

    async canActivate(_context: ExecutionContext): Promise<boolean> {
        const workspaceId = this.requestStoreService.get<string>(this.storeKey);

        const workspace =
            await this.workspaceDomain.validateWorkspaceGuard(workspaceId);

        this.requestStoreService.set(WorkspaceStoreKey, workspace);

        return true;
    }
}
