import {
    Doc,
    DocAuth,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { PolicyListResponseSchema } from '@modules/policy/dtos/response/policy.list.response.dto';
import type { PolicyListResponseDto } from '@modules/policy/dtos/response/policy.list.response.dto';
import { applyDecorators } from '@nestjs/common';

export function PolicySystemListByRoleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all policies granted by a role',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse<PolicyListResponseDto>('policy.listByRole', {
            schema: PolicyListResponseSchema,
        })
    );
}
