import { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { Workspace } from '@generated/prisma-client';
import { ProjectStoreKey } from '@modules/project/constants/project.constant';
import { ProjectService } from '@modules/project/services/project.service';
import { WorkspaceStoreKey } from '@modules/workspace/constants/workspace.constant';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

/**
 * Resolves the active, non-deleted project — scoped to the workspace resolved by `WorkspaceGuard`
 * (which must run before this guard) — from the `projectId` route param, and caches it for the
 * guards stacked above this one.
 */
@Injectable()
export class ProjectGuard implements CanActivate {
    constructor(
        private readonly projectService: ProjectService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<IRequestApp>();
        const projectId = request.params.projectId;

        const workspace = this.requestStoreService.get<Workspace>(
            WorkspaceStoreKey
        );

        const project = await this.projectService.validateProjectGuard(
            workspace?.id ?? null,
            projectId ?? null
        );

        this.requestStoreService.set(ProjectStoreKey, project);

        return true;
    }
}
