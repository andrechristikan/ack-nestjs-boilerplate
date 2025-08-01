import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@common/doc/enums/doc.enum';
import { TermPolicyAcceptRequestDto } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import { TermPolicyAcceptanceResponseDto } from '@modules/term-policy/dtos/response/term-policy-acceptance.response.dto';
import { applyDecorators } from '@nestjs/common';

export function TermPolicyUserAcceptedDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'User retrieves all accepted terms and policies',
        }),
        DocAuth({
            jwtAccessToken: true,
            xApiKey: true,
        }),
        DocGuard({
            role: true,
        }),
        DocResponsePaging<TermPolicyAcceptanceResponseDto>(
            'termPolicy.accepted',
            {
                dto: TermPolicyAcceptanceResponseDto,
            }
        )
    );
}

export function TermPolicyUserAcceptDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'User accepts term or policy',
        }),
        DocAuth({
            jwtAccessToken: true,
            xApiKey: true,
        }),
        DocGuard({
            role: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: TermPolicyAcceptRequestDto,
        }),
        DocResponse('termPolicy.accept')
    );
}
