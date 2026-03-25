import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
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
