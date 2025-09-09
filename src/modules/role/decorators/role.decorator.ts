import { ROLE_META_KEY } from '@modules/role/constants/role.constant';
import { RoleGuard } from '@modules/role/guards/role.guard';
import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { ENUM_ROLE_TYPE } from '@prisma/client';

/**
 * Method decorator that applies role-based protection guards
 * @param {...ENUM_ROLE_TYPE[]} roles - List of role types required for access
 * @returns {MethodDecorator} Combined decorators for role validation
 */
export function RoleProtected(...roles: ENUM_ROLE_TYPE[]): MethodDecorator {
    return applyDecorators(
        UseGuards(RoleGuard),
        SetMetadata(ROLE_META_KEY, roles)
    );
}
