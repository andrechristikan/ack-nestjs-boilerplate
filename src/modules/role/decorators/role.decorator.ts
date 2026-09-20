import {
    DocRoleErrorResponses,
    RoleRequiredMetaKey,
} from '@modules/role/constants/role.constant';
import { RoleGuard } from '@modules/role/guards/role.guard';
import {
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { EnumRoleType } from '@generated/prisma-client/client';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import type { IUser } from '@modules/user/interfaces/user.interface';
import type { IRoleWithPolicies } from '@modules/role/interfaces/role.interface';

/**
 * Restricts a route to the given role types via RoleGuard and documents role kits.
 * @public
 */
export function RoleProtected(
    ...requiredRoles: EnumRoleType[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(RoleGuard),
        SetMetadata(RoleRequiredMetaKey, requiredRoles),
        DocRoleErrorResponses.forbidden,
        DocRoleErrorResponses.predefinedNotFound
    );
}

/**
 * Reads the current user's role with its policies, or one of its fields, that `UserGuard` stored; throws when either is absent.
 * @public
 */
export const RoleCurrent = createParamDecorator<
    Extract<keyof IRoleWithPolicies, string> | undefined,
    | IRoleWithPolicies
    | NonNullable<IRoleWithPolicies[Extract<keyof IRoleWithPolicies, string>]>
>(
    (
        field: Extract<keyof IRoleWithPolicies, string> | undefined
    ):
        | IRoleWithPolicies
        | NonNullable<
              IRoleWithPolicies[Extract<keyof IRoleWithPolicies, string>]
          > => {
        const user = ClsServiceManager.getClsService().get<IUser | undefined>(
            UserStoreKey
        );
        if (user === undefined || user === null) {
            throw new RequestContextMissingException(UserStoreKey);
        }

        const { role } = user;
        if (role === undefined || role === null) {
            throw new RequestContextMissingException(`${UserStoreKey}.role`);
        }

        if (field === undefined || field === null) {
            return role;
        }

        const value = role[field];
        if (value === undefined || value === null) {
            throw new RequestContextMissingException(
                `${UserStoreKey}.role.${field}`
            );
        }

        return value;
    }
);
