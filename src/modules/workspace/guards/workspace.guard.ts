import { RequestWorkspaceIdStoreKey } from '@common/request/constants/request.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { WorkspaceStoreKey } from '@modules/workspace/constants/workspace.constant';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class WorkspaceGuard implements CanActivate {
    constructor(
        private readonly workspaceService: WorkspaceService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(_context: ExecutionContext): Promise<boolean> {
        const workspaceId = this.requestStoreService.get<string>(
            RequestWorkspaceIdStoreKey
        );

        const workspace =
            await this.workspaceService.validateWorkspaceGuard(workspaceId);

        this.requestStoreService.set(WorkspaceStoreKey, workspace);

        return true;
    }
}
