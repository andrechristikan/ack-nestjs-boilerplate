import { IRequestAppWithProjectTenant } from '@modules/project/interfaces/request.project.interface';
import { ProjectService } from '@modules/project/services/project.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

/**
 * Resolves and validates project membership for project resource routes.
 */
@Injectable()
export class ProjectMemberGuard implements CanActivate {
    constructor(private readonly projectService: ProjectService) {}

    /**
     * Resolves and attaches the current project member to the request.
     *
     * Tenant owners and admins bypass the explicit membership requirement and
     * leave `request.__projectMember` unset (they retain full access via role).
     *
     * @throws ForbiddenException if the user is not authenticated or is not a member of the project
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<IRequestAppWithProjectTenant>();
        const projectMember =
            await this.projectService.validateProjectMemberGuard(request);

        if (projectMember) {
            request.__projectMember = projectMember;
        }

        return true;
    }
}
