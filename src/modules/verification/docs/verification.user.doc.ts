import {
    Doc,
    DocAuth,
    DocGuard,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { VerificationMobileNumberResponseDto } from '@modules/verification/dtos/response/verification.mobile-number.response.dto';
import { applyDecorators } from '@nestjs/common';

export function VerificationUserRequestMobileNumberDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'request mobile number verification',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true }),
        DocResponse('verification.requestMobileNumber', {
            dto: VerificationMobileNumberResponseDto,
        })
    );
}
