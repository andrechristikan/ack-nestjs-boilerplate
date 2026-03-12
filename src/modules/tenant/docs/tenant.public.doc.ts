import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { InviteClaimRequestDto } from '@modules/invite/dtos/request/invite-claim.request.dto';
import { InvitePublicResponseDto } from '@modules/invite/dtos/response/invite-public.response.dto';
import { TenantLoginRequestDto } from '@modules/tenant/dtos/request/tenant.login.request.dto';
import { TenantLoginResponseDto } from '@modules/tenant/dtos/response/tenant.login.response.dto';
import { applyDecorators } from '@nestjs/common';

export function TenantPublicGetInviteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Get tenant invite details by token',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocRequest({
            params: [{ name: 'token', required: true, type: 'string' }],
        }),
        DocResponse<InvitePublicResponseDto>('tenant.invite.get', {
            dto: InvitePublicResponseDto,
        })
    );
}

export function TenantPublicClaimInviteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Complete signup via a tenant invite token' }),
        DocAuth({ xApiKey: true }),
        DocRequest({
            params: [{ name: 'token', required: true, type: 'string' }],
            bodyType: EnumDocRequestBodyType.json,
            dto: InviteClaimRequestDto,
        }),
        DocResponse('tenant.invite.claim')
    );
}

export function TenantPublicLoginCredentialDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'Agency application login with tenant membership validation',
            description:
                'Authenticate user credentials and validate tenant membership. Only users with active tenant memberships can login. Returns tokens and list of available tenants.',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: TenantLoginRequestDto,
        }),
        DocResponse('tenant.loginCredential', {
            dto: TenantLoginResponseDto,
        })
    );
}
