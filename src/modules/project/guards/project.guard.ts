import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { Workspace } from '@generated/prisma-client/client';
import { ProjectStoreKey } from '@modules/project/constants/project.constant';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { WorkspaceStoreKey } from '@modules/workspace/constants/workspace.constant';
import { WorkspaceGuardMissingException } from '@modules/workspace/exceptions/workspace.guard-missing.exception';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';

/**
 * Resolves the active, non-deleted project — scoped to the workspace resolved by `WorkspaceGuard`
 * (which must run before this guard) — from the `projectId` route param, and caches it for the
 * guards stacked above this one.
 */
@Injectable()
export class ProjectGuard implements CanActivate {
    constructor(
        private readonly projectDomain: ProjectDomain,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<IRequestApp>();
        const projectId = request.params.projectId;

        const workspace =
            this.requestStoreService.get<Workspace>(WorkspaceStoreKey);
        if (!workspace) {
            throw new WorkspaceGuardMissingException();
        }

        const project = await this.projectDomain.validateProjectGuard(
            workspace.id,
            projectId ?? null
        );

        this.requestStoreService.set(ProjectStoreKey, project);

        return true;
    }
}
