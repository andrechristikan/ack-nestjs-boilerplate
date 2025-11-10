import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@common/doc/enums/doc.enum';
import { ResetPasswordForgotRequestDto } from '@modules/reset-password/dtos/requests/reset-password.forgot.request.dto';
import { ResetPasswordResetRequestDto } from '@modules/reset-password/dtos/requests/reset-password.reset.request';
import { applyDecorators } from '@nestjs/common';

export function ResetPasswordPublicForgotDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'User forgot password',
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: ResetPasswordForgotRequestDto,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse('resetPassword.forgot')
    );
}

export function ResetPasswordPublicResetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'User reset password',
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: ResetPasswordResetRequestDto,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse('resetPassword.reset')
    );
}
