import {
    RoleProtectedDocErrors,
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
import { DocErrors } from '@common/doc/decorators/doc.decorator';
import { UserGuardMissingException } from '@modules/user/exceptions/user.guard-missing.exception';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import type { IUser } from '@modules/user/interfaces/user.interface';
import type {
    IRoleWithPolicies,
    IRoleWithPoliciesField,
    IRoleWithPoliciesFieldValue,
} from '@modules/role/interfaces/role.interface';
import { RoleProtectedEmptyException } from '@modules/role/exceptions/role.protected-empty.exception';

/** @public */
export function RoleProtected(
    ...requiredRoles: EnumRoleType[]
): MethodDecorator {
    if (requiredRoles.length === 0) {
        throw new RoleProtectedEmptyException();
    }

    return applyDecorators(
        UseGuards(RoleGuard),
        SetMetadata(RoleRequiredMetaKey, requiredRoles),
        DocErrors(...RoleProtectedDocErrors)
    );
}

/** @public */
export const RoleCurrent = createParamDecorator<
    IRoleWithPoliciesField | undefined,
    IRoleWithPolicies | IRoleWithPoliciesFieldValue
>(
    (
        field: IRoleWithPoliciesField | undefined
    ): IRoleWithPolicies | IRoleWithPoliciesFieldValue => {
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
