import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { EnumRoleType } from '@generated/prisma-client/client';
import { RoleRequiredMetaKey } from '@modules/role/constants/role.constant';
import { PolicyStoreKey } from '@modules/policy/constants/policy.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserStoreKey } from '@modules/user/constants/user.constant';

/**
 * Validates the request user's role against the route's required roles
 * and stashes the resolved policies in the request store.
 */
@Injectable()
export class RoleGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly roleDomain: RoleDomain,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const roleMetadata = this.reflector.get<EnumRoleType[]>(
            RoleRequiredMetaKey,
            context.getHandler()
        );
        const requiredRoles = roleMetadata ?? [];

        const user = this.requestStoreService.get<IUser>(UserStoreKey);
        const policies = await this.roleDomain.validateRoleGuard(
            user,
            requiredRoles
        );

        this.requestStoreService.set(PolicyStoreKey, policies);

        return true;
    }
}
