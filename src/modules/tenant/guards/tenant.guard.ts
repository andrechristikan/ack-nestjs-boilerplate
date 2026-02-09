import { IRequestApp } from '@common/request/interfaces/request.interface';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TenantService } from '@modules/tenant/services/tenant.service';

@Injectable()
export class TenantGuard implements CanActivate {
    constructor(private readonly tenantService: TenantService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<IRequestApp>();
        const tenant = await this.tenantService.validateTenantGuard(request);

        request.__tenant = tenant;

        return true;
    }
}
