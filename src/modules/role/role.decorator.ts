import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    SetMetadata,
    UseGuards,
} from '@nestjs/common';
import { ROLE_ACTIVE_META_KEY } from './constants/role.constant';
import { RoleActiveGuard } from './guards/role.active.guard';
import { RoleNotFoundGuard } from './guards/role.not-found.guard';
import { RolePutToRequestGuard } from './guards/role.put-to-request.guard';
import { RoleUsedGuard } from './guards/role.used.guard';

export const GetRole = createParamDecorator(
    (data: string, ctx: ExecutionContext) => {
        const { __role } = ctx.switchToHttp().getRequest();
        return __role;
    }
);

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
