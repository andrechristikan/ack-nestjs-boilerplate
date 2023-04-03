import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ROLE_ACTIVE_META_KEY } from 'src/modules/role/constants/role.constant';
import { RoleActiveGuard } from 'src/modules/role/guards/role.active.guard';
import { RoleNotFoundGuard } from 'src/modules/role/guards/role.not-found.guard';
import { RolePutToRequestGuard } from 'src/modules/role/guards/role.put-to-request.guard';

export function RoleGetGuard(): MethodDecorator {
    return applyDecorators(UseGuards(RolePutToRequestGuard, RoleNotFoundGuard));
}

export function RoleUpdateGuard(): MethodDecorator {
    return applyDecorators(
        UseGuards(RolePutToRequestGuard, RoleNotFoundGuard, RoleActiveGuard),
        SetMetadata(ROLE_ACTIVE_META_KEY, [true])
    );
}

export function RoleDeleteGuard(): MethodDecorator {
    return applyDecorators(
        UseGuards(RolePutToRequestGuard, RoleNotFoundGuard, RoleActiveGuard),
        SetMetadata(ROLE_ACTIVE_META_KEY, [true])
    );
}

export function RoleUpdateActiveGuard(): MethodDecorator {
    return applyDecorators(
        UseGuards(RolePutToRequestGuard, RoleNotFoundGuard, RoleActiveGuard),
        SetMetadata(ROLE_ACTIVE_META_KEY, [false])
    );
}

export function RoleUpdateInactiveGuard(): MethodDecorator {
    return applyDecorators(
        UseGuards(RolePutToRequestGuard, RoleNotFoundGuard, RoleActiveGuard),
        SetMetadata(ROLE_ACTIVE_META_KEY, [true])
    );
}
