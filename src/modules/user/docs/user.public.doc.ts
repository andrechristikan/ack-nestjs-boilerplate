import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { AuthTokenResponseSchema } from '@modules/auth/dtos/response/auth.token.response.dto';
import type { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import { UserLoginResponseSchema } from '@modules/user/dtos/response/user.login.response.dto';
import type { UserLoginResponseDto } from '@modules/user/dtos/response/user.login.response.dto';
import { UserTwoFactorEnableResponseSchema } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import type { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import { HttpStatus, applyDecorators } from '@nestjs/common';

export function UserPublicLoginCredentialDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'login with credential',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocGuard({ featureFlag: true }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocResponse<UserLoginResponseDto>('user.loginCredential', {
            schema: UserLoginResponseSchema,
        })
    );
}

export function AuthPublicLoginSocialGoogleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Login with social google',
        }),
        DocAuth({ xApiKey: true, google: true }),
        DocGuard({ featureFlag: true }),
        DocResponse<UserLoginResponseDto>('auth.loginWithSocialGoogle', {
            schema: UserLoginResponseSchema,
        })
    );
}

export function AuthPublicLoginSocialAppleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Login with social apple',
        }),
        DocAuth({ xApiKey: true, apple: true }),
        DocGuard({ featureFlag: true }),
        DocResponse<UserLoginResponseDto>('auth.loginWithSocialApple', {
            schema: UserLoginResponseSchema,
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
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocGuard({ featureFlag: true }),
        DocResponse('user.signUp', {
            httpStatus: HttpStatus.CREATED,
        })
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
        }),
        DocResponse('user.verifyEmail')
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
        }),
        DocResponse('user.sendEmailVerification')
    );
}

export function UserPublicForgotPasswordDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'User forgot password',
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocGuard({ featureFlag: true }),
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
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocGuard({ featureFlag: true }),
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
        }),
        DocResponse<AuthTokenResponseDto>('user.loginVerifyTwoFactor', {
            schema: AuthTokenResponseSchema,
        })
    );
}

export function UserPublicLoginSetupTwoFactorDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'User enable two factor during login after reset by admin. Required setup 2FA flow',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocResponse<UserTwoFactorEnableResponseDto>(
            'user.loginSetupTwoFactor',
            {
                schema: UserTwoFactorEnableResponseSchema,
            }
        )
    );
}
