import { IRequestAppWithProjectTenant } from '@modules/project/interfaces/request.project.interface';
import { ProjectRoleRequiredMetaKey } from '@modules/project/constants/project.constant';
import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    HttpStatus,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EnumProjectMemberRole, EnumTenantMemberRole } from '@generated/prisma-client';

/**
 * Enforces project role requirements based on role metadata.
 *
 * Reads the required project member roles from route metadata and ensures the
 * current member's role matches at least one of them. Tenant owners and admins
 * bypass this check and are always granted access.
 */
@Injectable()
export class ProjectRoleGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    /**
     * Validates that the current member has one of the required project roles.
     *
     * @throws ForbiddenException if the member's role does not satisfy the required roles
     */
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

        const tenantRole = request.__tenantMember?.role;
        if (
            tenantRole === EnumTenantMemberRole.owner ||
            tenantRole === EnumTenantMemberRole.admin
        ) {
            return true;
        }

        const projectMember = request.__projectMember;
        if (projectMember && requiredRoles.includes(projectMember.role)) {
            return true;
        }

        throw new ForbiddenException({
            statusCode: HttpStatus.FORBIDDEN,
            message: 'project.member.error.forbidden',
        });
    }
}
