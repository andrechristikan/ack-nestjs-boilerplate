import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { InviteClaimRequestDto } from '@modules/invite/dtos/request/invite-claim.request.dto';
import { TenantInviteResponseDto } from '@modules/invite/dtos/response/tenant-invite.response.dto';
import { applyDecorators } from '@nestjs/common';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';

export function TenantPublicGetInviteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Get tenant invite details by token',
        }),
        DocAuth({ xApiKey: true }),
        DocRequest({
            params: [{ name: 'token', required: true, type: 'string' }],
        }),
        DocResponse<TenantInviteResponseDto>('tenant.invite.get', {
            dto: TenantInviteResponseDto,
        })
    );
}

export function TenantPublicSignupAndClaimDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Sign up and claim a tenant invite (unregistered users)' }),
        DocAuth({ xApiKey: true }),
        DocRequest({
            params: [{ name: 'token', required: true, type: 'string' }],
            bodyType: EnumDocRequestBodyType.json,
            dto: InviteClaimRequestDto,
        }),
        DocResponse('tenant.invite.claim')
    );
}
