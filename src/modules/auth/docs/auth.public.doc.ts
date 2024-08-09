import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import { AuthLoginRequestDto } from 'src/modules/auth/dtos/request/auth.login.request.dto';
import { AuthLoginResponseDto } from 'src/modules/auth/dtos/response/auth.login.response.dto';

export function AuthPublicLoginCredentialDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'login with email and password',
        }),
        DocAuth({ xApiKey: true }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: AuthLoginRequestDto,
        }),
        DocResponse<AuthLoginResponseDto>('auth.loginWithCredential', {
            dto: AuthLoginResponseDto,
        })
    );
}

export function AuthPublicLoginSocialGoogleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'login with social google',
        }),
        DocAuth({ xApiKey: true, google: true }),
        DocResponse<AuthLoginResponseDto>('auth.loginWithSocialGoogle', {
            dto: AuthLoginResponseDto,
        })
    );
}

export function AuthPublicLoginSocialAppleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'login with social apple',
        }),
        DocAuth({ xApiKey: true, apple: true }),
        DocResponse<AuthLoginResponseDto>('auth.loginWithSocialApple', {
            dto: AuthLoginResponseDto,
        })
    );
}
