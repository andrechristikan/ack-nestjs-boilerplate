import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponsePagination,
} from '@common/doc/decorators/doc.decorator';
import { TermPolicyResponseSchema } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import type { TermPolicyResponseDto } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import { TermPolicyDefaultAvailableOrderBy } from '@modules/term-policy/constants/term-policy.list.constant';
import { TermPolicyListPublicDocQuery } from '@modules/term-policy/constants/term-policy.doc.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';

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
        DocResponsePagination<TermPolicyResponseDto>('termPolicy.list', {
            schema: TermPolicyResponseSchema,
            availableOrderBy: TermPolicyDefaultAvailableOrderBy,
            type: EnumPaginationType.cursor,
        })
    );
}
