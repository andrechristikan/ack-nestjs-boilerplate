import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/constants/doc.enum.constant';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocGuard,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';
import {
    RoleDocParamsId,
    RoleDocQueryIsActive,
    RoleDocQueryType,
} from 'src/modules/role/constants/role.doc.constant';
import { RoleCreateDto } from 'src/modules/role/dtos/role.create.dto';
import { RoleUpdateDto } from 'src/modules/role/dtos/role.update.dto';
import { RoleGetSerialization } from 'src/modules/role/serializations/role.get.serialization';
import { RoleListSerialization } from 'src/modules/role/serializations/role.list.serialization';

export function RoleAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all of roles',
        }),
        DocRequest({
            queries: [...RoleDocQueryIsActive, ...RoleDocQueryType],
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<RoleListSerialization>('role.list', {
            serialization: RoleListSerialization,
        })
    );
}

export function RoleAdminGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get detail a role',
        }),
        DocRequest({
            params: RoleDocParamsId,
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<RoleGetSerialization>('role.get', {
            serialization: RoleGetSerialization,
        })
    );
}

export function RoleAdminCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create a role',
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            body: RoleCreateDto,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<ResponseIdSerialization>('role.create', {
            httpStatus: HttpStatus.CREATED,
            serialization: ResponseIdSerialization,
        })
    );
}

export function RoleAdminActiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'make role be active',
        }),
        DocRequest({
            params: RoleDocParamsId,
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse('role.active')
    );
}

export function RoleAdminInactiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'make role be inactive',
        }),
        DocRequest({
            params: RoleDocParamsId,
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse('role.inactive')
    );
}

export function RoleAdminUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update data a role',
        }),
        DocRequest({
            params: RoleDocParamsId,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            body: RoleUpdateDto,
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<ResponseIdSerialization>('role.update', {
            serialization: ResponseIdSerialization,
        })
    );
}

export function RoleAdminDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'delete a role',
        }),
        DocRequest({
            params: RoleDocParamsId,
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse('role.delete')
    );
}
