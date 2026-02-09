import { IRequestApp } from '@common/request/interfaces/request.interface';
import { TenantRoleRequiredMetaKey } from '@modules/tenant/constants/tenant.constant';
import { TenantService } from '@modules/tenant/services/tenant.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class TenantRoleGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly tenantService: TenantService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoleKeys =
            this.reflector.get<string[]>(
                TenantRoleRequiredMetaKey,
                context.getHandler()
            ) ?? [];

        const request = context.switchToHttp().getRequest<IRequestApp>();

        return this.tenantService.validateTenantRoleGuard(
            request,
            requiredRoleKeys
        );
    }
}
