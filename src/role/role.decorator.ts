import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    SetMetadata,
    UseGuards,
} from '@nestjs/common';
import { RoleActiveGuard } from './guard/role.active.guard';
import { RoleNotFoundGuard } from './guard/role.not-found.guard';
import { RolePutToRequestGuard } from './guard/role.put-to-request.guard';
import { RoleUsedGuard } from './guard/role.used.guard';
import { ROLE_ACTIVE_META_KEY } from './role.constant';

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
