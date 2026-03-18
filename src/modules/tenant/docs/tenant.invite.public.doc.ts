import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { TenantInviteSignupRequestDto } from '@modules/tenant/dtos/request/tenant-invite-signup.request.dto';
import { TenantInviteResponseDto } from '@modules/tenant/dtos/response/tenant-invite.response.dto';
import { applyDecorators } from '@nestjs/common';

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
            dto: TenantInviteSignupRequestDto,
        }),
        DocResponse('tenant.invite.claim')
    );
}
