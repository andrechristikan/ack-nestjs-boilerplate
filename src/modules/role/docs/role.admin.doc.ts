import { applyDecorators, HttpStatus } from '@nestjs/common';
import { Doc, DocPaging } from 'src/common/doc/decorators/doc.decorator';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';
import {
    RoleDocParamsGet,
    RoleDocQueryIsActive,
    RoleDocQueryType,
} from 'src/modules/role/constants/role.doc.constant';
import { RoleGetSerialization } from 'src/modules/role/serializations/role.get.serialization';
import { RoleListSerialization } from 'src/modules/role/serializations/role.list.serialization';

export function RoleAdminListDoc(): MethodDecorator {
    return applyDecorators(
        DocPaging<RoleListSerialization>('role.list', {
            auth: {
                jwtAccessToken: true,
            },
            request: {
                queries: [...RoleDocQueryIsActive, ...RoleDocQueryType],
            },
            response: {
                serialization: RoleListSerialization,
            },
        })
    );
}

export function RoleAdminGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc<RoleGetSerialization>('role.get', {
            auth: {
                jwtAccessToken: true,
            },
            request: {
                params: RoleDocParamsGet,
            },
            response: { serialization: RoleGetSerialization },
        })
    );
}

export function RoleAdminCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc<ResponseIdSerialization>('role.create', {
            auth: {
                jwtAccessToken: true,
            },
            response: {
                httpStatus: HttpStatus.CREATED,
                serialization: ResponseIdSerialization,
            },
        })
    );
}

export function RoleAdminUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc<ResponseIdSerialization>('role.update', {
            auth: {
                jwtAccessToken: true,
            },
            request: {
                params: RoleDocParamsGet,
            },
            response: { serialization: ResponseIdSerialization },
        })
    );
}

export function RoleAdminDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc<void>('role.delete', {
            auth: {
                jwtAccessToken: true,
            },
            request: {
                params: RoleDocParamsGet,
            },
        })
    );
}

export function RoleAdminActiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc<void>('role.active', {
            auth: {
                jwtAccessToken: true,
            },
            request: {
                params: RoleDocParamsGet,
            },
        })
    );
}

export function RoleAdminInactiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc<void>('role.inactive', {
            auth: {
                jwtAccessToken: true,
            },
            request: {
                params: RoleDocParamsGet,
            },
        })
    );
}
