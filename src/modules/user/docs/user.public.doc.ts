import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@common/doc/enums/doc.enum';
import { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import { UserTokenResponseDto } from '@modules/user/dtos/response/user.token.response.dto';
import { HttpStatus, applyDecorators } from '@nestjs/common';

export function UserPublicLoginCredentialDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'login with credential',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: UserLoginRequestDto,
        }),
        DocResponse('user.loginCredential', {
            dto: UserTokenResponseDto,
        })
    );
}

export function AuthPublicLoginSocialGoogleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Login with social google',
        }),
        DocAuth({ xApiKey: true, google: true }),
        DocResponse('auth.loginWithSocialGoogle', {
            dto: UserTokenResponseDto,
        })
    );
}

export function AuthPublicLoginSocialAppleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Login with social apple',
        }),
        DocAuth({ xApiKey: true, apple: true }),
        DocResponse('auth.loginWithSocialApple', {
            dto: UserTokenResponseDto,
        })
    );
}

export function UserPublicSignUpDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'User sign up',
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: UserSignUpRequestDto,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse('user.signUp', {
            httpStatus: HttpStatus.CREATED,
        })
    );
}
