import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { TermPolicyAcceptRequestDto } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import { TermPolicyUserAcceptanceResponseDto } from '@modules/term-policy/dtos/response/term-policy.user-acceptance.response.dto';
import { applyDecorators } from '@nestjs/common';

export function TermPolicySharedListAcceptedDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'List of terms or policies accepted by the user',
        }),
        DocAuth({
            jwtAccessToken: true,
            xApiKey: true,
        }),
        DocResponsePaging<TermPolicyUserAcceptanceResponseDto>(
            'termPolicy.accepted',
            {
                dto: TermPolicyUserAcceptanceResponseDto,
                type: EnumPaginationType.cursor,
            }
        )
    );
}

export function TermPolicySharedAcceptDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'User accepts term or policy',
        }),
        DocAuth({
            jwtAccessToken: true,
            xApiKey: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: TermPolicyAcceptRequestDto,
        }),
        DocResponse('termPolicy.accept')
    );
}
