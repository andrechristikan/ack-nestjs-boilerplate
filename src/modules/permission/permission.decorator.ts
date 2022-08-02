import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    SetMetadata,
    UseGuards,
} from '@nestjs/common';
import { PERMISSION_ACTIVE_META_KEY } from './constants/permission.constant';
import { PermissionActiveGuard } from './guards/permission.active.guard';
import { PermissionNotFoundGuard } from './guards/permission.not-found.guard';
import { PermissionPutToRequestGuard } from './guards/permission.put-to-request.guard';

export const GetPermission = createParamDecorator(
    (data: string, ctx: ExecutionContext) => {
        const { __permission } = ctx.switchToHttp().getRequest();
        return __permission;
    }
);

export function PermissionGetGuard(): any {
    return applyDecorators(
        UseGuards(PermissionPutToRequestGuard, PermissionNotFoundGuard)
    );
}

export function PermissionUpdateGuard(): any {
    return applyDecorators(
        UseGuards(
            PermissionPutToRequestGuard,
            PermissionNotFoundGuard,
            PermissionActiveGuard
        ),
        SetMetadata(PERMISSION_ACTIVE_META_KEY, [true])
    );
}

export function PermissionUpdateActiveGuard(): any {
    return applyDecorators(
        UseGuards(
            PermissionPutToRequestGuard,
            PermissionNotFoundGuard,
            PermissionActiveGuard
        ),
        SetMetadata(PERMISSION_ACTIVE_META_KEY, [false])
    );
}

export function PermissionUpdateInactiveGuard(): any {
    return applyDecorators(
        UseGuards(
            PermissionPutToRequestGuard,
            PermissionNotFoundGuard,
            PermissionActiveGuard
        ),
        SetMetadata(PERMISSION_ACTIVE_META_KEY, [true])
    );
}
