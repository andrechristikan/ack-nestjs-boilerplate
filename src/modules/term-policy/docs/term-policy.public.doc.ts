import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { TermPolicyResponseDto } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import { TermPolicyListPublicDocQuery } from '@modules/term-policy/constants/term-policy.doc.constant';

export function TermPolicyPublicListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Retrieve list of publish terms and policies',
        }),
        DocRequest({
            queries: TermPolicyListPublicDocQuery,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponsePaging<TermPolicyResponseDto>('termPolicy.list', {
            dto: TermPolicyResponseDto,
        })
    );
}
