import {
    RoleProtectedDocErrors,
    RoleRequiredMetaKey,
} from '@modules/role/constants/role.constant';
import { RoleGuard } from '@modules/role/guards/role.guard';
import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { EnumRoleType } from '@generated/prisma-client/client';
import { DocErrors } from '@common/doc/decorators/doc.decorator';
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
