import { applyDecorators, HttpStatus } from '@nestjs/common';
import { Doc, DocPaging } from 'src/common/doc/decorators/doc.decorator';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';
import {
    RoleDocParamsGet,
    RoleDocQueryAccessFor,
    RoleDocQueryIsActive,
} from 'src/modules/role/constants/role.doc.constant';
import {
    ROLE_DEFAULT_AVAILABLE_ORDER_BY,
    ROLE_DEFAULT_AVAILABLE_SEARCH,
} from 'src/modules/role/constants/role.list.constant';
import { RoleAccessForSerialization } from 'src/modules/role/serializations/role.access-for.serialization';
import { RoleGetSerialization } from 'src/modules/role/serializations/role.get.serialization';
import { RoleListSerialization } from 'src/modules/role/serializations/role.list.serialization';

export function RoleListDoc(): MethodDecorator {
    return applyDecorators(
        DocPaging<RoleListSerialization>('role.list', {
            auth: {
                jwtAccessToken: true,
                permissionToken: true,
            },
            request: {
                queries: [...RoleDocQueryIsActive, ...RoleDocQueryAccessFor],
            },
            response: {
                serialization: RoleListSerialization,
                availableOrderBy: ROLE_DEFAULT_AVAILABLE_ORDER_BY,
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
                permissionToken: true,
            },
            request: {
                params: RoleDocParamsGet,
            },
            response: { serialization: RoleGetSerialization },
        })
    );
}

export function RoleCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc<ResponseIdSerialization>('role.create', {
            auth: {
                jwtAccessToken: true,
                permissionToken: true,
            },
            response: {
                httpStatus: HttpStatus.CREATED,
                serialization: ResponseIdSerialization,
            },
        })
    );
}

export function RoleUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc<ResponseIdSerialization>('role.update', {
            auth: {
                jwtAccessToken: true,
                permissionToken: true,
            },
            request: {
                params: RoleDocParamsGet,
            },
            response: { serialization: ResponseIdSerialization },
        })
    );
}

export function RoleDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc<void>('role.delete', {
            auth: {
                jwtAccessToken: true,
                permissionToken: true,
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
                permissionToken: true,
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
                permissionToken: true,
            },
            request: {
                params: RoleDocParamsGet,
            },
        })
    );
}

export function RoleAccessForDoc(): MethodDecorator {
    return applyDecorators(
        Doc<RoleAccessForSerialization>('role.accessFor', {
            auth: {
                jwtAccessToken: true,
                permissionToken: true,
            },
            response: { serialization: RoleAccessForSerialization },
        })
    );
}
