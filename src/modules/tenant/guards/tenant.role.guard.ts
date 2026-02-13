import { TenantRoleRequiredMetaKey } from '@modules/tenant/constants/tenant.constant';
import { TenantService } from '@modules/tenant/services/tenant.service';
import { IRequestAppWithTenant } from '@modules/tenant/interfaces/request.tenant.interface';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Enforces tenant role requirements based on role metadata.
 *
 * This guard reads the required role names from route metadata and ensures
 * the current member's role matches at least one of them.
 */
@Injectable()
export class TenantRoleGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly tenantService: TenantService
    ) {}

    /**
     * Validates that the current member has one of the required roles.
     *
     * @throws InternalServerErrorException if no roles are configured on the route
     * @throws ForbiddenException if the member does not have a required role
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoleKeys =
            this.reflector.get<string[]>(
                TenantRoleRequiredMetaKey,
                context.getHandler()
            ) ?? [];

        const request =
            context.switchToHttp().getRequest<IRequestAppWithTenant>();

        return this.tenantService.validateTenantRoleGuard(
            request,
            requiredRoleKeys
        );
    }
}
