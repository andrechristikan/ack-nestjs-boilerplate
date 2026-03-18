import { IRequestAppWithProjectTenant } from '@modules/project/interfaces/request.project.interface';
import { ProjectRoleRequiredMetaKey } from '@modules/project/constants/project.constant';
import { ProjectService } from '@modules/project/services/project.service';
import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    HttpStatus,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EnumProjectMemberRole, EnumTenantMemberRole } from '@generated/prisma-client';

@Injectable()
export class ProjectRoleGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly projectService: ProjectService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles =
            this.reflector.get<EnumProjectMemberRole[]>(
                ProjectRoleRequiredMetaKey,
                context.getHandler()
            ) ?? [];

        if (!requiredRoles.length) {
            return true;
        }

        const request = context
            .switchToHttp()
            .getRequest<IRequestAppWithProjectTenant>();
        const projectMember =
            await this.projectService.validateProjectMemberGuard(request);
        if (projectMember) {
            request.__projectMember = projectMember;
        }

        const tenantRole = request.__tenantMember?.role;
        if (
            tenantRole === EnumTenantMemberRole.owner ||
            tenantRole === EnumTenantMemberRole.admin
        ) {
            return true;
        }

        if (projectMember && requiredRoles.includes(projectMember.role)) {
            return true;
        }

        throw new ForbiddenException({
            statusCode: HttpStatus.FORBIDDEN,
            message: 'project.member.error.forbidden',
        });
    }
}
