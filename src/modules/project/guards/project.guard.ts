import { IRequestAppWithProjectTenant } from '@modules/project/interfaces/request.project.interface';
import { ProjectService } from '@modules/project/services/project.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

/**
 * Validates the project context for the request.
 *
 * Resolves the project from the route params, verifying it belongs to the
 * current tenant when a tenant context is present. On success, stores the
 * resolved project in `request.__project` for downstream guards.
 */
@Injectable()
export class ProjectGuard implements CanActivate {
    constructor(private readonly projectService: ProjectService) {}

    /**
     * Resolves and attaches the current project to the request.
     *
     * @throws NotFoundException if the project does not exist or does not belong to the current tenant
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<IRequestAppWithProjectTenant>();

        request.__project = await this.projectService.validateProjectGuard(request);

        return true;
    }
}
