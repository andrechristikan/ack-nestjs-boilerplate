import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { TenantInviteCreateRequestDto } from '@modules/tenant/dtos/request/tenant-invite.create.request.dto';
import { TenantInviteResponseDto } from '@modules/tenant/dtos/response/tenant-invite.response.dto';
import { applyDecorators } from '@nestjs/common';

export function TenantSharedCreateMemberInviteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create tenant invite',
        }),
        DocAuth({ jwtAccessToken: true, xApiKey: true }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: TenantInviteCreateRequestDto,
        }),
        DocResponse<TenantInviteResponseDto>('tenant.member.invite.create', {
            dto: TenantInviteResponseDto,
        })
    );
}

export function TenantSharedDeleteMemberInviteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'revoke tenant invite',
        }),
        DocAuth({ jwtAccessToken: true, xApiKey: true }),
        DocRequest({
            params: [{ name: 'inviteId', required: true, type: 'string' }],
        }),
        DocResponse('tenant.invite.revoke')
    );
}

export function TenantSharedListMemberInvitesDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list tenant invites',
        }),
        DocAuth({ jwtAccessToken: true, xApiKey: true }),
        DocResponsePaging<TenantInviteResponseDto>('tenant.invite.list', {
            dto: TenantInviteResponseDto,
        })
    );
}

export function TenantSharedClaimInviteDoc(): MethodDecorator {
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
