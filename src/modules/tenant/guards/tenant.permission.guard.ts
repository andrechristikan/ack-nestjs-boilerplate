import { IRequestApp } from '@common/request/interfaces/request.interface';
import { TenantPermissionRequiredMetaKey } from '@modules/tenant/constants/tenant.constant';
import { TenantService } from '@modules/tenant/services/tenant.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';

@Injectable()
export class TenantPermissionGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly tenantService: TenantService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredAbilities =
            this.reflector.get<RoleAbilityRequestDto[]>(
                TenantPermissionRequiredMetaKey,
                context.getHandler()
            ) ?? [];

        const request = context.switchToHttp().getRequest<IRequestApp>();

        return this.tenantService.validateTenantPermissionGuard(
            request,
            requiredAbilities
        );
    }
}
