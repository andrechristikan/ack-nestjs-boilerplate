import { IRequestApp } from '@common/request/interfaces/request.interface';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TenantService } from '@modules/tenant/services/tenant.service';

@Injectable()
export class TenantMemberGuard implements CanActivate {
    constructor(private readonly tenantService: TenantService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<IRequestApp>();
        const tenantMember =
            await this.tenantService.validateTenantMemberGuard(request);

        request.__tenantMember = tenantMember;

        return true;
    }
}
