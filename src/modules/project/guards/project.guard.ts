import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { Workspace } from '@generated/prisma-client/client';
import { ProjectStoreKey } from '@modules/project/constants/project.constant';
import { ProjectService } from '@modules/project/services/project.service';
import { WorkspaceStoreKey } from '@modules/workspace/constants/workspace.constant';
import { WorkspaceGuardMissingException } from '@modules/workspace/exceptions/workspace.guard-missing.exception';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class ProjectGuard implements CanActivate {
    constructor(
        private readonly projectService: ProjectService,
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

        const project = await this.projectService.validateProjectGuard(
            workspace.id,
            projectId ?? null
        );

        this.requestStoreService.set(ProjectStoreKey, project);

        return true;
    }
}
