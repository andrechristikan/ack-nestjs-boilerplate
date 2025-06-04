import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@common/doc/enums/doc.enum';
import { AuthChangePasswordRequestDto } from '@module/auth/dtos/request/auth.change-password.request.dto';
import { AuthRefreshResponseDto } from '@module/auth/dtos/response/auth.refresh.response.dto';

export function AuthSharedRefreshDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'refresh a token',
        }),
        DocAuth({
            xApiKey: true,
            jwtRefreshToken: true,
        }),
        DocResponse<AuthRefreshResponseDto>('auth.refresh', {
            dto: AuthRefreshResponseDto,
        })
    );
}

export function AuthSharedChangePasswordDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'change password',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: AuthChangePasswordRequestDto,
        }),
        DocResponse('auth.changePassword')
    );
}
