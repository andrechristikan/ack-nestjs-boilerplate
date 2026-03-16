import { IRequestAppWithTenant } from '@modules/tenant/interfaces/request.tenant.interface';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TenantService } from '@modules/tenant/services/tenant.service';

/**
 * Validates the tenant context for the request.
 *
 * This guard checks that the `x-tenant-id` header exists, is a valid database
 * id, and resolves to an active tenant. On success, it stores the resolved
 * tenant in `request.__tenant` for downstream handlers.
 */
@Injectable()
export class TenantGuard implements CanActivate {
    constructor(private readonly tenantService: TenantService) {}

    /**
     * Resolves and attaches the current tenant to the request.
     *
     * @throws BadRequestException if the tenant id is missing or invalid
     * @throws NotFoundException if the tenant does not exist
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<IRequestAppWithTenant>();
        const tenant = await this.tenantService.validateTenantGuard(request);

        request.__tenant = tenant;

        return true;
    }
}
