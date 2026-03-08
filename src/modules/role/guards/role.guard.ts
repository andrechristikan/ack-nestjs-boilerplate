import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { RoleService } from '@modules/role/services/role.service';
import { EnumRoleType } from '@prisma/client';
import { RoleRequiredMetaKey } from '@modules/role/constants/role.constant';

/**
 * Guard that validates user access based on role types
 */
@Injectable()
export class RoleGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly roleService: RoleService
    ) {}

    /**
     * Validates if the current user has the required role to access the resource
     * @param {ExecutionContext} context - NestJS execution context containing request information
     * @returns {Promise<boolean>} Promise that resolves to true if user has required role access
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles =
            this.reflector.getAllAndOverride<EnumRoleType[]>(
                RoleRequiredMetaKey,
                [context.getHandler(), context.getClass()]
            ) ?? [];

        const request = context.switchToHttp().getRequest<IRequestApp>();
        await this.roleService.validateRoleGuard(request, requiredRoles);

        return true;
    }
}
