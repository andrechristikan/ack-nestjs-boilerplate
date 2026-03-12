import { ProjectPermissionRequiredMetaKey } from '@modules/project/constants/project.constant';
import { IRequestAppWithProject } from '@modules/project/interfaces/request.project.interface';
import { ProjectService } from '@modules/project/services/project.service';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Enforces project permission requirements based on abilities metadata.
 */
@Injectable()
export class ProjectPermissionGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly projectService: ProjectService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredAbilities =
            this.reflector.get<RoleAbilityRequestDto[]>(
                ProjectPermissionRequiredMetaKey,
                context.getHandler()
            ) ?? [];

        const request = context
            .switchToHttp()
            .getRequest<IRequestAppWithProject>();

        return this.projectService.validateProjectPermissionGuard(
            request,
            requiredAbilities
        );
    }
}
