import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@common/doc/enums/doc.enum';
import { TermPolicyAcceptRequestDto } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import { TermPolicyAcceptanceGetResponseDto } from '@modules/term-policy/dtos/response/term-policy-acceptance.get.response.dto';
import { TermPolicyAcceptanceListResponseDto } from '@modules/term-policy/dtos/response/term-policy-acceptance.list.response.dto';
import { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { TermPolicyGetResponseDto } from '@modules/term-policy/dtos/response/term-policy.get.response.dto';
import { TermPolicyDocParamsId } from '@modules/term-policy/constants/term-policy.doc.constant';
import { TermPolicyListResponseDto } from '@modules/term-policy/dtos/response/term-policy.list.response.dto';

export function TermPolicyAuthListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list all term-policy',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponsePaging<TermPolicyListResponseDto>('termPolicy.list', {
            dto: TermPolicyListResponseDto,
        })
    );
}

export function TermPolicyAuthUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update term-policy',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocRequest({
            params: [TermPolicyDocParamsId],
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: TermPolicyCreateRequestDto,
        }),
        DocResponse<TermPolicyGetResponseDto>('termPolicy.update', {
            dto: TermPolicyGetResponseDto,
        })
    );
}

export function TermPolicyAuthGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get term or policy',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocRequest({
            params: [TermPolicyDocParamsId],
        }),
        DocResponse<TermPolicyGetResponseDto>('termPolicy.get', {
            dto: TermPolicyGetResponseDto,
        })
    );
}

export function TermPolicyAuthAcceptDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Logged-in user accepts term or policy',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: TermPolicyAcceptRequestDto,
        }),
        DocResponse<TermPolicyAcceptanceGetResponseDto>(
            'termPolicy.accept',
            {
                dto: TermPolicyAcceptanceGetResponseDto,
            }
        )
    );
}

export function TermPolicyAuthAcceptedDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Logged-in user retrieves all accepted terms and policies',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponse<TermPolicyAcceptanceListResponseDto>(
            'termPolicy.accepted',
            {
                dto: TermPolicyAcceptanceListResponseDto,
            }
        )
    );
}
