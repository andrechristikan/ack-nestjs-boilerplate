import { applyDecorators, HttpStatus } from '@nestjs/common';
import { Doc, DocPaging } from 'src/common/doc/decorators/doc.decorator';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';
import { RoleDocParamsGet } from 'src/modules/role/constants/role.doc.constant';
import {
    ROLE_DEFAULT_AVAILABLE_SEARCH,
    ROLE_DEFAULT_AVAILABLE_SORT,
} from 'src/modules/role/constants/role.list.constant';
import { RoleGetSerialization } from 'src/modules/role/serializations/role.get.serialization';
import { RoleListSerialization } from 'src/modules/role/serializations/role.list.serialization';

export function RoleListDoc(): MethodDecorator {
    return applyDecorators(
        DocPaging<RoleListSerialization>('role.list', {
            auth: {
                jwtAccessToken: true,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            response: {
                classSerialization: RoleListSerialization,
                availableSort: ROLE_DEFAULT_AVAILABLE_SORT,
                availableSearch: ROLE_DEFAULT_AVAILABLE_SEARCH,
            },
        })
    );
}

export function RoleGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc<RoleGetSerialization>('role.get', {
            auth: {
                jwtAccessToken: true,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            request: {
                params: RoleDocParamsGet,
            },
            response: { classSerialization: RoleGetSerialization },
        })
    );
}

export function RoleCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc<ResponseIdSerialization>('role.create', {
            auth: {
                jwtAccessToken: true,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            response: {
                httpStatus: HttpStatus.CREATED,
                classSerialization: ResponseIdSerialization,
            },
        })
    );
}

export function RoleUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc<ResponseIdSerialization>('role.update', {
            auth: {
                jwtAccessToken: true,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            request: {
                params: RoleDocParamsGet,
            },
            response: { classSerialization: ResponseIdSerialization },
        })
    );
}

export function RoleDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc<void>('role.delete', {
            auth: {
                jwtAccessToken: true,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            request: {
                params: RoleDocParamsGet,
            },
        })
    );
}

export function RoleActiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc<void>('role.active', {
            auth: {
                jwtAccessToken: true,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            request: {
                params: RoleDocParamsGet,
            },
        })
    );
}

export function RoleInactiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc<void>('role.inactive', {
            auth: {
                jwtAccessToken: true,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            request: {
                params: RoleDocParamsGet,
            },
        })
    );
}
