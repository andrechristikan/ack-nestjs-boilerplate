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
import {
    DocUserErrorResponses,
    UserStoreKey,
} from '@modules/user/constants/user.constant';
import { UserGuardMissingException } from '@modules/user/exceptions/user.guard-missing.exception';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import type { IUser } from '@modules/user/interfaces/user.interface';
import type { IRoleWithPolicies } from '@modules/role/interfaces/role.interface';
import { RoleProtectedEmptyException } from '@modules/role/exceptions/role.protected-empty.exception';

/**
 * Restricts a route to the given role types via RoleGuard and documents role kits and the missing user store.
 * @public
 */
export function RoleProtected(
    ...requiredRoles: EnumRoleType[]
): MethodDecorator {
    if (requiredRoles.length === 0) {
        throw new RoleProtectedEmptyException();
    }

    return applyDecorators(
        UseGuards(RoleGuard),
        SetMetadata(RoleRequiredMetaKey, requiredRoles),
        DocRoleErrorResponses.forbidden,
        DocUserErrorResponses.guardMissing
    );
}

/**
 * Reads the current user's role with its policies, or one of its fields, that `UserGuard` stored; throws `UserGuardMissingException` when the user is absent and `RequestContextMissingException` when the requested field is null.
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
        const user =
            ClsServiceManager.getClsService().get<IUser | null>(UserStoreKey) ??
            null;
        if (user === null) {
            throw new UserGuardMissingException();
        }

        const { role } = user;
        const fieldKey = field ?? null;
        if (fieldKey === null) {
            return role;
        }

        const value = role[fieldKey] ?? null;
        if (value === null) {
            throw new RequestContextMissingException(
                `${UserStoreKey}.role.${field}`
            );
        }

        return value;
    }
);
