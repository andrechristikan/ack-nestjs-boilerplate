import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
    DocTenantRoleProtected,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { TenantDocParamsMemberId } from '@modules/tenant/constants/tenant.doc.constant';
import { TenantMemberCreateRequestDto } from '@modules/tenant/dtos/request/tenant.member.create.request.dto';
import { TenantMemberUpdateRequestDto } from '@modules/tenant/dtos/request/tenant.member.update.request.dto';
import { TenantUpdateRequestDto } from '@modules/tenant/dtos/request/tenant.update.request.dto';
import { TenantMemberResponseDto } from '@modules/tenant/dtos/response/tenant.member.response.dto';
import { TenantResponseDto } from '@modules/tenant/dtos/response/tenant.response.dto';
import { HttpStatus, applyDecorators } from '@nestjs/common';

export function TenantSharedGetCurrentTenantDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get current tenant',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantRoleProtected(),
        DocResponse<TenantResponseDto>('tenant.get', {
            dto: TenantResponseDto,
        })
    );
}

export function TenantSharedUpdateCurrentTenantDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update current tenant',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantRoleProtected(),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: TenantUpdateRequestDto,
        }),
        DocResponse('tenant.update')
    );
}

export function TenantSharedListMembersDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list current tenant members',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantRoleProtected(),
        DocResponsePaging<TenantMemberResponseDto>('tenant.member.list', {
            dto: TenantMemberResponseDto,
        })
    );
}

export function TenantSharedCreateMemberDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create tenant member',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantRoleProtected(),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: TenantMemberCreateRequestDto,
        }),
        DocResponse<DatabaseIdDto>('tenant.member.create', {
            httpStatus: HttpStatus.CREATED,
            dto: DatabaseIdDto,
        })
    );
}

export function TenantSharedListMemberRolesDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list tenant member roles',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantRoleProtected(),
        DocResponse('tenant.member.roles')
    );
}

export function TenantSharedUpdateMemberDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update tenant member',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantRoleProtected(),
        DocRequest({
            params: TenantDocParamsMemberId,
            bodyType: EnumDocRequestBodyType.json,
            dto: TenantMemberUpdateRequestDto,
        }),
        DocResponse('tenant.member.update')
    );
}

export function TenantSharedDeleteMemberDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'delete tenant member',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantRoleProtected(),
        DocRequest({
            params: TenantDocParamsMemberId,
        }),
        DocResponse('tenant.member.delete')
    );
}
