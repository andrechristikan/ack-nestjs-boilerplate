import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import { ResetPasswordDocParamsToken } from 'src/modules/reset-password/constants/reset-password.doc.constant';
import { ResetPasswordCreateRequestDto } from 'src/modules/reset-password/dtos/request/reset-password.create.request.dto';
import { ResetPasswordResetRequestDto } from 'src/modules/reset-password/dtos/request/reset-password.reset.request.dto';
import { ResetPasswordVerifyRequestDto } from 'src/modules/reset-password/dtos/request/reset-password.verify.request.dto';
import { ResetPasswordCreteResponseDto } from 'src/modules/reset-password/dtos/response/reset-password.create.response.dto';

export function ResetPasswordPublicRequestDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'request otp for reset password',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: ResetPasswordCreateRequestDto,
        }),
        DocResponse<ResetPasswordCreteResponseDto>('resetPassword.request', {
            dto: ResetPasswordCreteResponseDto,
        })
    );
}

export function ResetPasswordPublicGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get a reset password',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocRequest({
            params: ResetPasswordDocParamsToken,
        }),
        DocResponse('resetPassword.get')
    );
}

export function ResetPasswordPublicVerifyDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'verify otp a reset password',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocRequest({
            params: ResetPasswordDocParamsToken,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: ResetPasswordVerifyRequestDto,
        }),
        DocResponse('resetPassword.verify')
    );
}

export function ResetPasswordPublicResetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'reset password',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocRequest({
            params: ResetPasswordDocParamsToken,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: ResetPasswordResetRequestDto,
        }),
        DocResponse('resetPassword.reset')
    );
}
