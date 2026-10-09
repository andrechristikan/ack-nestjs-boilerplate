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
import { hasRequestGuard } from '@common/request/decorators/request.decorator';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { RequestGuardMissingException } from '@common/request/exceptions/request.guard-missing.exception';
import { RequestProtectedGuardMissingException } from '@common/request/exceptions/request.protected-guard-missing.exception';
import { UserGuard } from '@modules/user/guards/user.guard';
import type { IUser } from '@modules/user/interfaces/user.interface';
import type { IRoleWithPolicies } from '@modules/role/interfaces/role.interface';
import { RoleProtectedEmptyException } from '@modules/role/exceptions/role.protected-empty.exception';

/**
 * Restricts a route to the given role types via RoleGuard and documents role kits; throws at decoration when UserGuard is not applied below it.
 * @public
 */
export function RoleProtected(
    ...requiredRoles: EnumRoleType[]
): MethodDecorator {
    if (requiredRoles.length === 0) {
        throw new RoleProtectedEmptyException();
    }

    const decorators = applyDecorators(
        UseGuards(RoleGuard),
        SetMetadata(RoleRequiredMetaKey, requiredRoles),
        DocRoleErrorResponses.forbidden
    );

    return (target, propertyKey, descriptor): void => {
        if (!hasRequestGuard(descriptor, UserGuard)) {
            throw new RequestProtectedGuardMissingException(
                'RoleProtected',
                UserGuard.name
            );
        }

        decorators(target, propertyKey, descriptor);
    };
}

/**
 * Reads the current user's role with its policies, or one of its fields, that `UserGuard` stored; throws `RequestGuardMissingException` when the user is absent and `RequestContextMissingException` when the requested field is null.
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
            throw new RequestGuardMissingException(UserStoreKey);
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
