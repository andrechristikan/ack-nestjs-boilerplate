import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ROLE_ACTIVE_META_KEY } from 'src/modules/role/constants/role.constant';
import { RoleActiveGuard } from 'src/modules/role/guards/role.active.guard';
import { RoleNotFoundGuard } from 'src/modules/role/guards/role.not-found.guard';
import { RolePutToRequestGuard } from 'src/modules/role/guards/role.put-to-request.guard';
import { RoleUsedGuard } from 'src/modules/role/guards/role.used.guard';

export function RoleGetGuard(): any {
    return applyDecorators(UseGuards(RolePutToRequestGuard, RoleNotFoundGuard));
}

export function RoleUpdateGuard(): any {
    return applyDecorators(
        UseGuards(
            RolePutToRequestGuard,
            RoleNotFoundGuard,
            RoleActiveGuard,
            RoleUsedGuard
        ),
        SetMetadata(ROLE_ACTIVE_META_KEY, [true])
    );
}

export function RoleDeleteGuard(): any {
    return applyDecorators(
        UseGuards(
            RolePutToRequestGuard,
            RoleNotFoundGuard,
            RoleActiveGuard,
            RoleUsedGuard
        ),
        SetMetadata(ROLE_ACTIVE_META_KEY, [true])
    );
}

export function RoleUpdateActiveGuard(): any {
    return applyDecorators(
        UseGuards(RolePutToRequestGuard, RoleNotFoundGuard, RoleActiveGuard),
        SetMetadata(ROLE_ACTIVE_META_KEY, [false])
    );
}

export function RoleUpdateInactiveGuard(): any {
    return applyDecorators(
        UseGuards(RolePutToRequestGuard, RoleNotFoundGuard, RoleActiveGuard),
        SetMetadata(ROLE_ACTIVE_META_KEY, [true])
    );
}
