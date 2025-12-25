import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import {
    RoleDocParamsId,
    RoleDocQueryList,
} from '@modules/role/constants/role.doc.constant';
import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleDto } from '@modules/role/dtos/role.dto';
import { HttpStatus, applyDecorators } from '@nestjs/common';

export function RoleAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get list of roles',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            queries: RoleDocQueryList,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
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
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            params: RoleDocParamsId,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponsePaging<RoleDto>('role.get', {
            dto: RoleDto,
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
            bodyType: EnumDocRequestBodyType.json,
            dto: RoleCreateRequestDto,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponse<RoleDto>('role.create', {
            httpStatus: HttpStatus.CREATED,
            dto: RoleDto,
        })
    );
}

export function RoleAdminUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update data a role',
        }),
        DocRequest({
            params: RoleDocParamsId,
            bodyType: EnumDocRequestBodyType.json,
            dto: RoleUpdateRequestDto,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponse<RoleDto>('role.update', {
            dto: RoleDto,
        })
    );
}

export function RoleAdminDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'delete data a role',
        }),
        DocRequest({
            params: RoleDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponse('role.delete')
    );
}
