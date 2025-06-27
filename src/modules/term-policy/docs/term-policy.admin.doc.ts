import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { TermPolicyGetResponseDto } from '@modules/term-policy/dtos/response/term-policy.get.response.dto';
import { TermPolicyCreateRequestDto } from '../dtos/request/term-policy.create.request.dto';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@common/doc/enums/doc.enum';
import { applyDecorators } from '@nestjs/common';

export function TermPolicyAdminCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create new term-policy',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: TermPolicyCreateRequestDto,
        }),
        DocResponse<TermPolicyGetResponseDto>('termPolicy.create', {
            dto: TermPolicyGetResponseDto,
        })
    );
}
