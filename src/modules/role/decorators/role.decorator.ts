import { ROLE_REQUIRED_META_KEY } from '@modules/role/constants/role.constant';
import { RoleGuard } from '@modules/role/guards/role.guard';
import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { EnumRoleType } from '@prisma/client';

/**
 * Method decorator that applies role-based protection guards
 * @param {...ROLE_REQUIRED_META_KEY[]} requiredRoles - List of role types required for access
 * @returns {MethodDecorator} Combined decorators for role validation
 */
export function RoleProtected(
    ...requiredRoles: EnumRoleType[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(RoleGuard),
        SetMetadata(ROLE_REQUIRED_META_KEY, requiredRoles)
    );
}
