import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@common/doc/enums/doc.enum';
import { TermsPolicyAcceptRequestDto } from '@modules/terms-policy/dtos/request/terms-policy.accept.request.dto';
import { TermsPolicyAcceptanceGetResponseDto } from '@modules/terms-policy/dtos/response/terms-policy-acceptance.get.response.dto';
import { TermsPolicyAcceptanceListResponseDto } from '@modules/terms-policy/dtos/response/terms-policy-acceptance.list.response.dto';
import { TermsPolicyCreateRequestDto } from '@modules/terms-policy/dtos/request/terms-policy.create.request.dto';
import { TermsPolicyGetResponseDto } from '@modules/terms-policy/dtos/response/terms-policy.get.response.dto';
import { TermsPolicyDocParamsId } from '@modules/terms-policy/constants/terms-policy.doc.constant';
import { TermsPolicyListResponseDto } from '@modules/terms-policy/dtos/response/terms-policy.list.response.dto';

export function TermsPolicyAuthListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list all terms-policy',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponsePaging<TermsPolicyListResponseDto>('terms-policy.list', {
            dto: TermsPolicyListResponseDto,
        })
    );
}

export function TermsPolicyAuthUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update terms-policy',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocRequest({
            params: [TermsPolicyDocParamsId],
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: TermsPolicyCreateRequestDto,
        }),
        DocResponse<TermsPolicyGetResponseDto>('terms-policy.update', {
            dto: TermsPolicyGetResponseDto,
        })
    );
}

export function TermsPolicyAuthGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get term or policy',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocRequest({
            params: [TermsPolicyDocParamsId],
        }),
        DocResponse<TermsPolicyGetResponseDto>('terms-policy.get', {
            dto: TermsPolicyGetResponseDto,
        })
    );
}

export function TermsPolicyAuthAcceptDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Logged-in user accepts term or policy',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: TermsPolicyAcceptRequestDto,
        }),
        DocResponse<TermsPolicyAcceptanceGetResponseDto>(
            'terms-policy.accept',
            {
                dto: TermsPolicyAcceptanceGetResponseDto,
            }
        )
    );
}

export function TermsPolicyAuthAcceptedDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Logged-in user retrieves all accepted terms and policies',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocResponse<TermsPolicyAcceptanceListResponseDto>(
            'terms-policy.accepted',
            {
                dto: TermsPolicyAcceptanceListResponseDto,
            }
        )
    );
}
