import { applyDecorators } from '@nestjs/common';
import { Doc, DocPaging } from 'src/common/doc/decorators/doc.decorator';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';
import {
    PermissionDocParamsGet,
    PermissionDocQueryList,
} from 'src/modules/permission/constants/permission.doc.constant';
import {
    PERMISSION_DEFAULT_AVAILABLE_SEARCH,
    PERMISSION_DEFAULT_AVAILABLE_SORT,
} from 'src/modules/permission/constants/permission.list.constant';
import { PermissionGetSerialization } from 'src/modules/permission/serializations/permission.get.serialization';
import { PermissionListSerialization } from 'src/modules/permission/serializations/permission.list.serialization';

export function PermissionListDoc(): any {
    return applyDecorators(
        DocPaging<PermissionListSerialization>('permission.list', {
            auth: {
                jwtAccessToken: true,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            request: {
                queries: PermissionDocQueryList,
            },
            response: {
                classSerialization: PermissionListSerialization,
                availableSort: PERMISSION_DEFAULT_AVAILABLE_SORT,
                availableSearch: PERMISSION_DEFAULT_AVAILABLE_SEARCH,
            },
        })
    );
}

export function PermissionGetDoc(): any {
    return applyDecorators(
        Doc<PermissionGetSerialization>('permission.get', {
            auth: {
                jwtAccessToken: true,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            request: {
                params: PermissionDocParamsGet,
            },
            response: { classSerialization: PermissionGetSerialization },
        })
    );
}

export function PermissionUpdateDoc(): any {
    return applyDecorators(
        Doc<ResponseIdSerialization>('permission.update', {
            auth: {
                jwtAccessToken: true,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            request: {
                params: PermissionDocParamsGet,
            },
            response: { classSerialization: ResponseIdSerialization },
        })
    );
}

export function PermissionActiveDoc(): any {
    return applyDecorators(
        Doc<void>('permission.active', {
            auth: {
                jwtAccessToken: true,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            request: {
                params: PermissionDocParamsGet,
            },
        })
    );
}

export function PermissionInactiveDoc(): any {
    return applyDecorators(
        Doc<void>('permission.inactive', {
            auth: {
                jwtAccessToken: true,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            request: {
                params: PermissionDocParamsGet,
            },
        })
    );
}
