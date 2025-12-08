import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { TermPolicyResponseDto } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import { TermPolicyListPublicDocQuery } from '@modules/term-policy/constants/term-policy.doc.constant';
import { ENUM_PAGINATION_TYPE } from '@common/pagination/enums/pagination.enum';

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
            type: ENUM_PAGINATION_TYPE.CURSOR,
        })
    );
}
