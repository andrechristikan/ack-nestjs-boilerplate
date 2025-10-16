import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@common/doc/enums/doc.enum';
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
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: TermPolicyAcceptRequestDto,
        }),
        DocResponse('termPolicy.accept')
    );
}
