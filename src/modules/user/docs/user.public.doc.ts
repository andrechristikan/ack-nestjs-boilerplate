import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { UserForgotPasswordResetRequestDto } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';
import { UserForgotPasswordRequestDto } from '@modules/user/dtos/request/user.forgot-password.request.dto';
import { UserLoginEnableTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-enable-two-factor.request.dto';
import { UserLoginVerifyTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';
import { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import { UserSendEmailVerificationRequestDto } from '@modules/user/dtos/request/user.send-email-verification.request.dto';
import { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import { UserVerifyEmailRequestDto } from '@modules/user/dtos/request/user.verify-email.request.dto';
import { UserLoginResponseDto } from '@modules/user/dtos/response/user.login.response.dto';
import { UserTokenResponseDto } from '@modules/user/dtos/response/user.token.response.dto';
import { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
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
            bodyType: EnumDocRequestBodyType.json,
            dto: UserLoginRequestDto,
        }),
        DocResponse('user.loginCredential', {
            dto: UserLoginResponseDto,
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
            dto: UserLoginResponseDto,
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
            dto: UserLoginResponseDto,
        })
    );
}

export function UserPublicSignUpDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'User sign up',
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
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

export function UserPublicSendEmailVerificationDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'User resend email verification',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserSendEmailVerificationRequestDto,
        }),
        DocResponse('user.sendEmailVerification')
    );
}

export function UserPublicVerifyEmailDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'User Email Verification',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserVerifyEmailRequestDto,
        }),
        DocResponse('user.verifyEmail')
    );
}

export function UserPublicForgotPasswordDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'User forgot password',
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserForgotPasswordRequestDto,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse('user.forgotPassword')
    );
}

export function UserPublicResetPasswordDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'User reset password',
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserForgotPasswordResetRequestDto,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse('user.resetPassword')
    );
}

export function UserPublicLoginVerifyTwoFactorDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'User verify two factor during login',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserLoginVerifyTwoFactorRequestDto,
        }),
        DocResponse('user.loginVerifyTwoFactor', {
            dto: UserTokenResponseDto,
        })
    );
}

export function UserPublicLoginEnableTwoFactorDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'User enable two factor during login, for required setup 2FA flow',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserLoginEnableTwoFactorRequestDto,
        }),
        DocResponse('user.loginEnableTwoFactor', {
            dto: UserTwoFactorEnableResponseDto,
        })
    );
}
