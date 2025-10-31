import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@common/doc/enums/doc.enum';
import { VerificationVerifyEmailRequestDto } from '@modules/verification/dtos/request/verification.verify-email.request.dto';
import { applyDecorators } from '@nestjs/common';

export function VerificationPublicVerifyEmailDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'User Email Verification',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: VerificationVerifyEmailRequestDto,
        }),
        DocResponse('verification.verifyEmail')
    );
}
