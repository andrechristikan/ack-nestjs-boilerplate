import { RequestStoreService } from '@common/request/services/request.store.service';
import { WorkspaceStoreKey } from '@modules/workspace/constants/workspace.constant';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
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
        private readonly workspaceService: WorkspaceService,
        private readonly requestStoreService: RequestStoreService
    ) {
        this.storeKey = this.configService.get<string>('workspace.storeKey')!;
    }

    async canActivate(_context: ExecutionContext): Promise<boolean> {
        const workspaceId = this.requestStoreService.get<string>(
            this.storeKey
        );

        const workspace =
            await this.workspaceService.validateWorkspaceGuard(workspaceId);

        this.requestStoreService.set(WorkspaceStoreKey, workspace);

        return true;
    }
}
