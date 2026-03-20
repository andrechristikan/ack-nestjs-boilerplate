import { IRequestAppWithTenant } from '@modules/tenant/interfaces/request.tenant.interface';
import {
    BadRequestException,
    CanActivate,
    ExecutionContext,
    Injectable,
} from '@nestjs/common';
import { TenantService } from '@modules/tenant/services/tenant.service';
import { isMongoId } from 'class-validator';
import { EnumTenantStatusCodeError } from '@modules/tenant/enums/tenant.status-code.enum';

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

        // If tenantId is provided in the URL, it must be a valid MongoDB ObjectId.
        // This prevents invalid route matches (e.g., /tenants/members matching /tenants/:tenantId)
        // from silently falling back to the x-tenant-id header.
        const paramTenantId = request.params?.tenantId;
        if (paramTenantId) {
            if (!isMongoId(paramTenantId)) {
                throw new BadRequestException({
                    statusCode: EnumTenantStatusCodeError.xTenantIdInvalid,
                    message: 'tenant.error.xTenantIdInvalid',
                });
            }
            request.__tenantId = paramTenantId;
        }

        const tenant = await this.tenantService.validateTenantGuard(request);

        request.__tenant = tenant;

        return true;
    }
}
