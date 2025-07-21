import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { TermPolicyListDocQuery } from '@modules/term-policy/constants/term-policy.doc.constant';
import { TermPolicyResponseDto } from '@modules/term-policy/dtos/response/term-policy.response.dto';

export function TermPolicyPublicListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Retrieve list of publish terms and policies',
        }),
        DocRequest({
            queries: TermPolicyListDocQuery,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse<TermPolicyResponseDto>('termPolicy.list', {
            dto: TermPolicyResponseDto,
        })
    );
}
