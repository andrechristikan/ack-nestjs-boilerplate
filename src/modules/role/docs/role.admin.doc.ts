import { applyDecorators, HttpStatus } from '@nestjs/common';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocGuard,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import {
    RoleDocParamsId,
    RoleDocQueryIsActive,
    RoleDocQueryType,
} from 'src/modules/role/constants/role.doc.constant';
import { RoleCreateRequestDto } from 'src/modules/role/dtos/request/role.create.request.dto';
import { RoleUpdateRequestDto } from 'src/modules/role/dtos/request/role.update.request.dto';
import { RoleGetResponseDto } from 'src/modules/role/dtos/response/role.get.response.dto';
import { RoleListResponseDto } from 'src/modules/role/dtos/response/role.list.response.dto';

export function RoleAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all of roles',
        }),
        DocRequest({
            queries: [...RoleDocQueryIsActive, ...RoleDocQueryType],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<RoleListResponseDto>('role.list', {
            dto: RoleListResponseDto,
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
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<RoleGetResponseDto>('role.get', {
            dto: RoleGetResponseDto,
        })
    );
}

export function RoleAdminCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create a role',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: RoleCreateRequestDto,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<DatabaseIdResponseDto>('role.create', {
            httpStatus: HttpStatus.CREATED,
            dto: DatabaseIdResponseDto,
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
            xApiKey: true,
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
            xApiKey: true,
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
            dto: RoleUpdateRequestDto,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<DatabaseIdResponseDto>('role.update', {
            dto: DatabaseIdResponseDto,
        })
    );
}
