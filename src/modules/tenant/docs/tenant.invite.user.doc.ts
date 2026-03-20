import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
    DocTenantRoleProtected,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { TenantDocParamsInviteId } from '@modules/tenant/constants/tenant.doc.constant';
import { TenantInviteCreateRequestDto } from '@modules/tenant/dtos/request/tenant-invite.create.request.dto';
import { TenantInviteResponseDto } from '@modules/tenant/dtos/response/tenant-invite.response.dto';
import { HttpStatus, applyDecorators } from '@nestjs/common';

export function TenantUserCreateInviteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create tenant invite',
        }),
        DocAuth({ jwtAccessToken: true, xApiKey: true }),
        DocTenantRoleProtected(),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: TenantInviteCreateRequestDto,
        }),
        DocResponse<TenantInviteResponseDto>('tenant.member.invite.create', {
            httpStatus: HttpStatus.CREATED,
            dto: TenantInviteResponseDto,
        })
    );
}

export function TenantUserDeleteInviteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'revoke tenant invite',
        }),
        DocAuth({ jwtAccessToken: true, xApiKey: true }),
        DocTenantRoleProtected(),
        DocRequest({
            params: TenantDocParamsInviteId,
        }),
        DocResponse('tenant.invite.revoke')
    );
}

export function TenantUserListInvitesDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list tenant invites',
        }),
        DocAuth({ jwtAccessToken: true, xApiKey: true }),
        DocTenantRoleProtected(),
        DocResponsePaging<TenantInviteResponseDto>('tenant.invite.list', {
            dto: TenantInviteResponseDto,
        })
    );
}

export function TenantUserClaimInviteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'claim a tenant invite (registered users)',
        }),
        DocAuth({ jwtAccessToken: true, xApiKey: true }),
        DocRequest({
            params: [{ name: 'token', required: true, type: 'string' }],
        }),
        DocResponse('tenant.invite.claim')
    );
}
