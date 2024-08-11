import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import { AuthLoginRequestDto } from 'src/modules/auth/dtos/request/auth.login.request.dto';
import { AuthSignUpRequestDto } from 'src/modules/auth/dtos/request/auth.sign-up.request.dto';
import { AuthLoginResponseDto } from 'src/modules/auth/dtos/response/auth.login.response.dto';

export function AuthPublicLoginCredentialDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Login with email and password',
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
            summary: 'Login with social google',
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
            summary: 'Login with social apple',
        }),
        DocAuth({ xApiKey: true, apple: true }),
        DocResponse<AuthLoginResponseDto>('auth.loginWithSocialApple', {
            dto: AuthLoginResponseDto,
        })
    );
}

export function AuthPublicSignUpDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Sign up',
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: AuthSignUpRequestDto,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse('auth.signUp', {
            httpStatus: HttpStatus.CREATED,
        })
    );
}
