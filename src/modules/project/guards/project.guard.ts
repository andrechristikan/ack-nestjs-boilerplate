import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { ProjectContextStoreKey } from '@modules/project/constants/project.constant';
import type { IProjectContext } from '@modules/project/interfaces/project.interface';
import { ProjectService } from '@modules/project/services/project.service';
import { WorkspaceContextStoreKey } from '@modules/workspace/constants/workspace.constant';
import type { IWorkspaceContextPatch } from '@modules/workspace/interfaces/workspace.interface';
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

        const workspaceContext =
            this.requestStoreService.get<IWorkspaceContextPatch>(
                WorkspaceContextStoreKey
            );
        const workspace = workspaceContext?.workspace ?? null;
        if (workspace === null) {
            throw new WorkspaceGuardMissingException();
        }

        const project = await this.projectService.validateProjectGuard(
            workspace.id,
            projectId ?? null
        );

        this.requestStoreService.merge<IProjectContext>(
            ProjectContextStoreKey,
            { project }
        );

        return true;
    }
}
