import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { PERMISSION_ACTIVE_META_KEY } from 'src/modules/permission/constants/permission.constant';
import { PermissionActiveGuard } from 'src/modules/permission/guards/permission.active.guard';
import { PermissionNotFoundGuard } from 'src/modules/permission/guards/permission.not-found.guard';
import { PermissionPutToRequestGuard } from 'src/modules/permission/guards/permission.put-to-request.guard';

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
