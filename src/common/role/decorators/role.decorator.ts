import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { ROLE_META_KEY } from 'src/common/role/constants/role.constant';
import { ENUM_ROLE_TYPE } from 'src/common/role/constants/role.enum.constant';
import { RoleGuard } from 'src/common/role/guards/role.guard';

export function RoleProtected(role: ENUM_ROLE_TYPE): MethodDecorator {
    return applyDecorators(
        UseGuards(RoleGuard),
        SetMetadata(ROLE_META_KEY, role)
    );
}
