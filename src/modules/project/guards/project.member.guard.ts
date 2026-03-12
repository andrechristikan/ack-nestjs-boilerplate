import { IRequestAppWithProjectTenant } from '@modules/project/interfaces/request.project.interface';
import { ProjectService } from '@modules/project/services/project.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

/**
 * Resolves and validates project membership for project resource routes.
 */
@Injectable()
export class ProjectMemberGuard implements CanActivate {
    constructor(private readonly projectService: ProjectService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<IRequestAppWithProjectTenant>();
        const projectMember =
            await this.projectService.validateProjectMemberGuard(request);

        request.__projectMember = projectMember;

        return true;
    }
}
