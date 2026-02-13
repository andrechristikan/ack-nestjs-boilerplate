import { TenantPermissionRequiredMetaKey } from '@modules/tenant/constants/tenant.constant';
import { TenantService } from '@modules/tenant/services/tenant.service';
import { IRequestAppWithTenant } from '@modules/tenant/interfaces/request.tenant.interface';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';

/**
 * Enforces tenant permission requirements based on abilities metadata.
 *
 * This guard reads the required abilities from route metadata and verifies
 * them against the current member's abilities stored on the request.
 */
@Injectable()
export class TenantPermissionGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly tenantService: TenantService
    ) {}

    /**
     * Validates that the current member has the required abilities.
     *
     * @throws InternalServerErrorException if no abilities are configured on the route
     * @throws ForbiddenException if the member lacks required abilities
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredAbilities =
            this.reflector.get<RoleAbilityRequestDto[]>(
                TenantPermissionRequiredMetaKey,
                context.getHandler()
            ) ?? [];

        const request =
            context.switchToHttp().getRequest<IRequestAppWithTenant>();

        return this.tenantService.validateTenantPermissionGuard(
            request,
            requiredAbilities
        );
    }
}
