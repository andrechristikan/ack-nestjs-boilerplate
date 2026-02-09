import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { TenantLoginRequestDto } from '@modules/tenant/dtos/request/tenant.login.request.dto';
import { TenantLoginResponseDto } from '@modules/tenant/dtos/response/tenant.login.response.dto';
import { applyDecorators } from '@nestjs/common';

export function TenantPublicLoginCredentialDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Agency application login with tenant membership validation',
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
