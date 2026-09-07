import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { PolicyDocParamsRoleId } from '@modules/policy/constants/policy.doc.constant';
import {
    PolicyListResponseDto,
    PolicyListResponseSchema,
} from '@modules/policy/dtos/response/policy.list.response.dto';
import { applyDecorators } from '@nestjs/common';

export function PolicySystemListByRoleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all policies granted by a role',
        }),
        DocRequest({
            params: PolicyDocParamsRoleId,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse<PolicyListResponseDto>('policy.listByRole', {
            schema: PolicyListResponseSchema,
        })
    );
}
