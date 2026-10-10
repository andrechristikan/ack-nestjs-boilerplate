import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { WorkspaceStoreKey } from '@modules/workspace/constants/workspace.constant';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Resolves the active, non-deleted workspace and stores it for the guards stacked above this one.
 * A validated `:workspaceId` route param wins; otherwise the workspace comes from the
 * `x-workspace-id` CLS store (set by `RequestWorkspaceMiddleware`).
 */
@Injectable()
export class WorkspaceGuard implements CanActivate {
    private readonly storeKey: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly workspaceDomain: WorkspaceDomain,
        private readonly databaseUtil: DatabaseUtil,
        private readonly requestStoreService: RequestStoreService
    ) {
        this.storeKey = this.configService.get<string>('workspace.storeKey')!;
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<IRequestApp>();
        const routeWorkspaceId = request.params.workspaceId;

        let workspaceId: string | null;
        if (routeWorkspaceId) {
            const isValid = this.databaseUtil.checkIdIsValid(routeWorkspaceId);
            if (!isValid) {
                throw new WorkspaceNotFoundException();
            }
            workspaceId = routeWorkspaceId;
        } else {
            workspaceId = this.requestStoreService.get<string>(this.storeKey);
        }

        const workspace =
            await this.workspaceDomain.validateWorkspaceGuard(workspaceId);

        this.requestStoreService.set(WorkspaceStoreKey, workspace);

        return true;
    }
}
