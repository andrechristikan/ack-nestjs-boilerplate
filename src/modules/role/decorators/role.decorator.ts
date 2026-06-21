import { RoleRequiredMetaKey } from '@modules/role/constants/role.constant';
import { RoleGuard } from '@modules/role/guards/role.guard';
import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { EnumRoleType } from '@generated/prisma-client';

/**
 * Restricts a route to the given role types via RoleGuard.
 */
export function RoleProtected(
    ...requiredRoles: EnumRoleType[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(RoleGuard),
        SetMetadata(RoleRequiredMetaKey, requiredRoles)
    );
}
