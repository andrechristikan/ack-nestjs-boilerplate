import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
    DocTenantPermissionProtected,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { InviteCreateRequestDto } from '@modules/invite/dtos/request/invite.create.request.dto';
import { InviteCreateResponseDto } from '@modules/invite/dtos/response/invite-create.response.dto';
import { InviteSendResponseDto } from '@modules/invite/dtos/response/invite-send.response.dto';
import {
    TenantDocParamsMemberId,
} from '@modules/tenant/constants/tenant.doc.constant';
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
        DocTenantPermissionProtected(),
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
        DocTenantPermissionProtected(),
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
        DocTenantPermissionProtected(),
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
        DocTenantPermissionProtected(),
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

export function TenantSharedCreateMemberInviteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create tenant member invite',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantPermissionProtected(),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: InviteCreateRequestDto,
        }),
        DocResponse<InviteCreateResponseDto>(
            'tenant.member.invite.create',
            {
                httpStatus: HttpStatus.CREATED,
                dto: InviteCreateResponseDto,
            }
        )
    );
}

export function TenantSharedSendMemberInviteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'send tenant member invite',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantPermissionProtected(),
        DocRequest({
            params: TenantDocParamsMemberId,
        }),
        DocResponse<InviteSendResponseDto>(
            'tenant.member.invite.send',
            {
                dto: InviteSendResponseDto,
            }
        )
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
        DocTenantPermissionProtected(),
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
        DocTenantPermissionProtected(),
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
        DocTenantPermissionProtected(),
        DocRequest({
            params: TenantDocParamsMemberId,
        }),
        DocResponse('tenant.member.delete')
    );
}
