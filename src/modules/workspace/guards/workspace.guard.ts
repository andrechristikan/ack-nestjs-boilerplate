import {
    WorkspaceContextStoreKey,
    WorkspaceIdStoreKey,
} from '@modules/workspace/constants/workspace.constant';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
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
        const workspaceId =
            this.requestStoreService.get<string>(WorkspaceIdStoreKey);

        const workspace =
            await this.workspaceService.validateWorkspaceGuard(workspaceId);

        this.requestStoreService.merge<IWorkspaceContext>(
            WorkspaceContextStoreKey,
            { workspaceId: workspace.id, workspace }
        );

        return true;
    }
}
