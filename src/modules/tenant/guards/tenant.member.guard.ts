import { IRequestAppWithTenant } from '@modules/tenant/interfaces/request.tenant.interface';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TenantService } from '@modules/tenant/services/tenant.service';

/**
 * Validates the tenant membership for the request.
 *
 * This guard ensures the user is authenticated and has an active membership
 * in the current tenant. It also verifies the tenant role scope and attaches
 * `request.__tenantMember` for authorization checks.
 */
@Injectable()
export class TenantMemberGuard implements CanActivate {
    constructor(private readonly tenantService: TenantService) {}

    /**
     * Resolves and attaches the current tenant member to the request.
     *
     * @throws ForbiddenException if the user is missing, not a member, has an
     * expired JIT membership, or has a role outside tenant scope
     * @throws BadRequestException/NotFoundException from tenant validation
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<IRequestAppWithTenant>();
        const tenantMember =
            await this.tenantService.validateTenantMemberGuard(request);

        request.__tenantMember = tenantMember;

        return true;
    }
}
