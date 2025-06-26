import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { TermsPolicyGetResponseDto } from '@modules/terms-policy/dtos/response/terms-policy.get.response.dto';
import { TermsPolicyCreateRequestDto } from '../dtos/request/terms-policy.create.request.dto';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@common/doc/enums/doc.enum';
import { applyDecorators } from '@nestjs/common';
import { TermsPolicyDocParamsId } from '@modules/terms-policy/constants/terms-policy.doc.constant';

export function TermsPolicyAdminCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create new terms-policy',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: TermsPolicyCreateRequestDto,
        }),
        DocResponse<TermsPolicyGetResponseDto>('terms-policy.create', {
            dto: TermsPolicyGetResponseDto,
        })
    );
}

export function TermsPolicyAdminDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'delete terms-policy',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            params: [TermsPolicyDocParamsId],
        }),
        DocResponse<TermsPolicyGetResponseDto>('terms-policy.delete')
    );
}