import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';
import {
    RoleDocParamsId,
    RoleDocQueryIsActive,
    RoleDocQueryType,
} from 'src/modules/role/constants/role.doc.constant';
import { RoleGetSerialization } from 'src/modules/role/serializations/role.get.serialization';
import { RoleListSerialization } from 'src/modules/role/serializations/role.list.serialization';

export function RoleAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocRequest({
            queries: [...RoleDocQueryIsActive, ...RoleDocQueryType],
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponsePaging<RoleListSerialization>('role.list', {
            serialization: RoleListSerialization,
        })
    );
}

export function RoleAdminGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocRequest({
            params: RoleDocParamsId,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponse<RoleGetSerialization>('role.get', {
            serialization: RoleGetSerialization,
        })
    );
}

export function RoleAdminCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponse<ResponseIdSerialization>('role.create', {
            httpStatus: HttpStatus.CREATED,
            serialization: ResponseIdSerialization,
        })
    );
}

export function RoleAdminActiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocRequest({
            params: RoleDocParamsId,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponse('role.active')
    );
}

export function RoleAdminInactiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocRequest({
            params: RoleDocParamsId,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponse('role.inactive')
    );
}

export function RoleAdminUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocRequest({
            params: RoleDocParamsId,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponse<ResponseIdSerialization>('role.update', {
            serialization: ResponseIdSerialization,
        })
    );
}

export function RoleAdminDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc(),
        DocRequest({
            params: RoleDocParamsId,
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponse('role.delete')
    );
}
