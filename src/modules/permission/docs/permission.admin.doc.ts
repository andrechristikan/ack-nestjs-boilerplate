import { applyDecorators } from '@nestjs/common';
import { Doc, DocPaging } from 'src/common/doc/decorators/doc.decorator';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';
import {
    PermissionDocParamsGet,
    PermissionDocQueryGroup,
    PermissionDocQueryIsActive,
} from 'src/modules/permission/constants/permission.doc.constant';
import {
    PERMISSION_DEFAULT_AVAILABLE_SEARCH,
    PERMISSION_DEFAULT_AVAILABLE_SORT,
} from 'src/modules/permission/constants/permission.list.constant';
import { PermissionGetSerialization } from 'src/modules/permission/serializations/permission.get.serialization';
import { PermissionGroupsSerialization } from 'src/modules/permission/serializations/permission.group.serialization';
import { PermissionListSerialization } from 'src/modules/permission/serializations/permission.list.serialization';

export function PermissionListDoc(): MethodDecorator {
    return applyDecorators(
        DocPaging<PermissionListSerialization>('permission.list', {
            auth: {
                jwtAccessToken: true,
                permissionToken: true,
            },
            request: {
                queries: [
                    ...PermissionDocQueryIsActive,
                    ...PermissionDocQueryGroup,
                ],
            },
            response: {
                serialization: PermissionListSerialization,
                availableSort: PERMISSION_DEFAULT_AVAILABLE_SORT,
                availableSearch: PERMISSION_DEFAULT_AVAILABLE_SEARCH,
            },
        })
    );
}

export function PermissionGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc<PermissionGetSerialization>('permission.get', {
            auth: {
                jwtAccessToken: true,
                permissionToken: true,
            },
            request: {
                params: PermissionDocParamsGet,
            },
            response: { serialization: PermissionGetSerialization },
        })
    );
}

export function PermissionUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc<ResponseIdSerialization>('permission.update', {
            auth: {
                jwtAccessToken: true,
                permissionToken: true,
            },
            request: {
                params: PermissionDocParamsGet,
            },
            response: { serialization: ResponseIdSerialization },
        })
    );
}

export function PermissionActiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc<void>('permission.active', {
            auth: {
                jwtAccessToken: true,
                permissionToken: true,
            },
            request: {
                params: PermissionDocParamsGet,
            },
        })
    );
}

export function PermissionInactiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc<void>('permission.inactive', {
            auth: {
                jwtAccessToken: true,
                permissionToken: true,
            },
            request: {
                params: PermissionDocParamsGet,
            },
        })
    );
}

export function PermissionGroupDoc(): MethodDecorator {
    return applyDecorators(
        Doc<PermissionGroupsSerialization>('permission.group', {
            auth: {
                jwtAccessToken: true,
                permissionToken: true,
            },
            request: {
                queries: PermissionDocQueryGroup,
            },
            response: {
                serialization: PermissionGroupsSerialization,
            },
        })
    );
}
