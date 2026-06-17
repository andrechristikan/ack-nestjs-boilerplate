import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleService } from '@modules/role/services/role.service';
import { EnumRoleType } from '@generated/prisma-client';
import {
    RoleAbilityStoreKey,
    RoleRequiredMetaKey,
} from '@modules/role/constants/role.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { IUser } from '@modules/user/interfaces/user.interface';
import { UserStoreKey } from '@modules/user/constants/user.constant';

/**
 * Guard that validates user access based on role types
 */
@Injectable()
export class RoleGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly roleService: RoleService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    /**
     * Validates if the current user has the required role to access the resource
     * @param {ExecutionContext} context - NestJS execution context containing request information
     * @returns {Promise<boolean>} Promise that resolves to true if user has required role access
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles =
            this.reflector.get<EnumRoleType[]>(
                RoleRequiredMetaKey,
                context.getHandler()
            ) ?? [];

        const user = this.requestStoreService.get<IUser>(UserStoreKey);
        const abilities = await this.roleService.validateRoleGuard(
            user,
            requiredRoles
        );

        this.requestStoreService.set(RoleAbilityStoreKey, abilities);

        return true;
    }
}
