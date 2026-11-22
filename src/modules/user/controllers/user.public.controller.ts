import { Doc } from '@common/doc/decorators/doc.decorator';
import {
    RequestContext,
    RequestThrottleProtected,
} from '@common/request/decorators/request.decorator';
import { EnumRequestThrottleRoute } from '@common/request/enums/request.enum';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { Response } from '@common/response/decorators/response.decorator';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    ApiKeyContext,
    ApiKeyProtected,
} from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthSocialAppleProtected,
    AuthSocialContext,
    AuthSocialGoogleProtected,
} from '@modules/auth/decorators/auth.social.decorator';
import { AuthTokenResponseSchema } from '@modules/auth/dtos/response/auth.token.response.dto';
import { FeatureFlagProtected } from '@modules/feature-flag/decorators/feature-flag.decorator';
import { EnumFeatureFlagKey } from '@modules/feature-flag/enums/feature-flag.enum';
import { UserCreateSocialRequestSchema } from '@modules/user/dtos/request/user.create-social.request.dto';
import type { UserCreateSocialRequestDto } from '@modules/user/dtos/request/user.create-social.request.dto';
import { UserForgotPasswordResetRequestSchema } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';
import type { UserForgotPasswordResetRequestDto } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';
import { UserForgotPasswordRequestSchema } from '@modules/user/dtos/request/user.forgot-password.request.dto';
import type { UserForgotPasswordRequestDto } from '@modules/user/dtos/request/user.forgot-password.request.dto';
import { UserLoginPasskeyRequestSchema } from '@modules/user/dtos/request/user.login-passkey.request.dto';
import type { UserLoginPasskeyRequestDto } from '@modules/user/dtos/request/user.login-passkey.request.dto';
import { UserResetPasswordGenerateMfaRequestSchema } from '@modules/user/dtos/request/user.reset-password-generate-mfa.request.dto';
import type { UserResetPasswordGenerateMfaRequestDto } from '@modules/user/dtos/request/user.reset-password-generate-mfa.request.dto';
import { UserLoginVerifyMfaRequestSchema } from '@modules/user/dtos/request/user.login-verify-mfa.request.dto';
import type { UserLoginVerifyMfaRequestDto } from '@modules/user/dtos/request/user.login-verify-mfa.request.dto';
import { UserLoginRequestSchema } from '@modules/user/dtos/request/user.login.request.dto';
import type { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import { UserSendEmailVerificationRequestSchema } from '@modules/user/dtos/request/user.send-email-verification.request.dto';
import type { UserSendEmailVerificationRequestDto } from '@modules/user/dtos/request/user.send-email-verification.request.dto';
import { UserSignUpRequestSchema } from '@modules/user/dtos/request/user.sign-up.request.dto';
import type { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import { UserVerifyEmailRequestSchema } from '@modules/user/dtos/request/user.verify-email.request.dto';
import type { UserVerifyEmailRequestDto } from '@modules/user/dtos/request/user.verify-email.request.dto';
import { UserResetPasswordGenerateMfaResponseSchema } from '@modules/user/dtos/response/user.reset-password-generate-mfa.response.dto';
import type { UserResetPasswordGenerateMfaResponseDto } from '@modules/user/dtos/response/user.reset-password-generate-mfa.response.dto';
import { UserLoginPasskeyGenerateResponseSchema } from '@modules/user/dtos/response/user.login-passkey-generate.response.dto';
import type { UserLoginPasskeyGenerateResponseDto } from '@modules/user/dtos/response/user.login-passkey-generate.response.dto';
import { UserLoginResponseSchema } from '@modules/user/dtos/response/user.login.response.dto';
import type {
    IUserAuthOutcome,
    IUserAuthTokenOutcome,
} from '@modules/user/interfaces/user.interface';
import { UserLoginCredentialUseCase } from '@modules/user/use-cases/user.login-credential.use-case';
import { UserLoginWithSocialUseCase } from '@modules/user/use-cases/user.login-with-social.use-case';
import { UserSignUpUseCase } from '@modules/user/use-cases/user.sign-up.use-case';
import { UserVerifyEmailUseCase } from '@modules/user/use-cases/user.verify-email.use-case';
import { UserSendVerificationEmailUseCase } from '@modules/user/use-cases/user.send-verification-email.use-case';
import { UserForgotPasswordUseCase } from '@modules/user/use-cases/user.forgot-password.use-case';
import { UserResetPasswordGenerateMfaUseCase } from '@modules/user/use-cases/user.reset-password-generate-mfa.use-case';
import { UserResetPasswordUseCase } from '@modules/user/use-cases/user.reset-password.use-case';
import { UserLoginVerifyMfaUseCase } from '@modules/user/use-cases/user.login-verify-mfa.use-case';
import { UserLoginGeneratePasskeyUseCase } from '@modules/user/use-cases/user.login-generate-passkey.use-case';
import { UserLoginWithPasskeyUseCase } from '@modules/user/use-cases/user.login-with-passkey.use-case';
import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Patch,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EnumUserLoginWith } from '@generated/prisma-client/client';
import type {
    IAuthSocialContext,
    IAuthToken,
} from '@modules/auth/interfaces/auth.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';

@ApiTags('modules.public.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserPublicController {
    constructor(
        private readonly userLoginCredentialUseCase: UserLoginCredentialUseCase,
        private readonly userLoginWithSocialUseCase: UserLoginWithSocialUseCase,
        private readonly userSignUpUseCase: UserSignUpUseCase,
        private readonly userVerifyEmailUseCase: UserVerifyEmailUseCase,
        private readonly userSendVerificationEmailUseCase: UserSendVerificationEmailUseCase,
        private readonly userForgotPasswordUseCase: UserForgotPasswordUseCase,
        private readonly userResetPasswordUseCase: UserResetPasswordUseCase,
        private readonly userResetPasswordGenerateMfaUseCase: UserResetPasswordGenerateMfaUseCase,
        private readonly userLoginVerifyMfaUseCase: UserLoginVerifyMfaUseCase,
        private readonly userLoginGeneratePasskeyUseCase: UserLoginGeneratePasskeyUseCase,
        private readonly userLoginWithPasskeyUseCase: UserLoginWithPasskeyUseCase
    ) {}

    @Doc({ summary: 'login with credential' })
    @Response('user.loginCredential', { schema: UserLoginResponseSchema })
    @FeatureFlagProtected(EnumFeatureFlagKey.loginWithCredential)
    @RequestThrottleProtected({ route: EnumRequestThrottleRoute.strict })
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/login/credential')
    async loginWithCredential(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @Body({ schema: UserLoginRequestSchema })
        body: UserLoginRequestDto
    ): Promise<IResponseReturn<IUserAuthOutcome>> {
        return this.userLoginCredentialUseCase.execute(
            requestContext,
            apiKeyContext,
            body
        );
    }

    @Doc({ summary: 'login with social google' })
    @Response('user.loginWithSocialGoogle', {
        schema: UserLoginResponseSchema,
    })
    @AuthSocialGoogleProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.loginWithGoogle)
    @RequestThrottleProtected({ route: EnumRequestThrottleRoute.strict })
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/login/social/google')
    async loginWithGoogle(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthSocialContext() authContext: IAuthSocialContext,
        @Body({ schema: UserCreateSocialRequestSchema })
        body: UserCreateSocialRequestDto
    ): Promise<IResponseReturn<IUserAuthOutcome>> {
        return this.userLoginWithSocialUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            EnumUserLoginWith.socialGoogle,
            body
        );
    }

    @Doc({ summary: 'login with social apple' })
    @Response('user.loginWithSocialApple', {
        schema: UserLoginResponseSchema,
    })
    @AuthSocialAppleProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.loginWithApple)
    @RequestThrottleProtected({ route: EnumRequestThrottleRoute.strict })
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/login/social/apple')
    async loginWithApple(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthSocialContext() authContext: IAuthSocialContext,
        @Body({ schema: UserCreateSocialRequestSchema })
        body: UserCreateSocialRequestDto
    ): Promise<IResponseReturn<IUserAuthOutcome>> {
        return this.userLoginWithSocialUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            EnumUserLoginWith.socialApple,
            body
        );
    }

    @Doc({ summary: 'user sign up' })
    @Response('user.signUp')
    @FeatureFlagProtected(EnumFeatureFlagKey.signUp)
    @RequestThrottleProtected({ route: EnumRequestThrottleRoute.strict })
    @ApiKeyProtected()
    @Post('/sign-up')
    async signUp(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @Body({ schema: UserSignUpRequestSchema })
        body: UserSignUpRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.userSignUpUseCase.execute(
            requestContext,
            apiKeyContext,
            body
        );
    }

    @Doc({ summary: 'user email verification' })
    @Response('user.verifyEmail')
    @RequestThrottleProtected({ route: EnumRequestThrottleRoute.strict })
    @ApiKeyProtected()
    @Patch('/email/verify')
    async verifyEmail(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @Body({ schema: UserVerifyEmailRequestSchema })
        body: UserVerifyEmailRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.userVerifyEmailUseCase.execute(
            requestContext,
            apiKeyContext,
            body
        );
    }

    @Doc({ summary: 'user resend email verification' })
    @Response('user.sendEmailVerification')
    @RequestThrottleProtected({ route: EnumRequestThrottleRoute.strict })
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/email/send')
    async sendEmailVerification(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @Body({ schema: UserSendEmailVerificationRequestSchema })
        body: UserSendEmailVerificationRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.userSendVerificationEmailUseCase.execute(
            requestContext,
            apiKeyContext,
            body
        );
    }

    @Doc({ summary: 'user forgot password' })
    @Response('user.forgotPassword')
    @FeatureFlagProtected(EnumFeatureFlagKey.changePassword)
    @RequestThrottleProtected({ route: EnumRequestThrottleRoute.strict })
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/password/forgot')
    async forgotPassword(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @Body({ schema: UserForgotPasswordRequestSchema })
        body: UserForgotPasswordRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.userForgotPasswordUseCase.execute(
            requestContext,
            apiKeyContext,
            body
        );
    }

    @Doc({ summary: 'user reset password' })
    @Response('user.resetPassword')
    @FeatureFlagProtected(EnumFeatureFlagKey.changePassword)
    @RequestThrottleProtected({ route: EnumRequestThrottleRoute.strict })
    @ApiKeyProtected()
    @Patch('/password/reset')
    async reset(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @Body({ schema: UserForgotPasswordResetRequestSchema })
        body: UserForgotPasswordResetRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.userResetPasswordUseCase.execute(
            requestContext,
            apiKeyContext,
            body
        );
    }

    @Doc({ summary: 'user reset password multi-factor authentication options' })
    @Response('user.resetPasswordGenerateMfa', {
        schema: UserResetPasswordGenerateMfaResponseSchema,
    })
    @FeatureFlagProtected(EnumFeatureFlagKey.changePassword)
    @RequestThrottleProtected({ route: EnumRequestThrottleRoute.strict })
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/password/reset/mfa/generate')
    async resetGenerateMfa(
        @Body({ schema: UserResetPasswordGenerateMfaRequestSchema })
        body: UserResetPasswordGenerateMfaRequestDto
    ): Promise<IResponseReturn<UserResetPasswordGenerateMfaResponseDto>> {
        return this.userResetPasswordGenerateMfaUseCase.execute(body);
    }

    @Doc({ summary: 'user verify multi-factor authentication during login' })
    @Response('user.verifyMfa', { schema: AuthTokenResponseSchema })
    @RequestThrottleProtected({ route: EnumRequestThrottleRoute.strict })
    @ApiKeyProtected()
    @Patch('/login/mfa/verify')
    async loginVerifyMfa(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @Body({ schema: UserLoginVerifyMfaRequestSchema })
        body: UserLoginVerifyMfaRequestDto
    ): Promise<IResponseReturn<IAuthToken>> {
        return this.userLoginVerifyMfaUseCase.execute(
            requestContext,
            apiKeyContext,
            body
        );
    }

    @Doc({ summary: 'generate passkey options for passwordless login' })
    @Response('user.loginGeneratePasskey', {
        schema: UserLoginPasskeyGenerateResponseSchema,
    })
    @FeatureFlagProtected(EnumFeatureFlagKey.loginWithPasskey)
    @RequestThrottleProtected({ route: EnumRequestThrottleRoute.strict })
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/login/passkey/generate')
    async loginGeneratePasskey(): Promise<
        IResponseReturn<UserLoginPasskeyGenerateResponseDto>
    > {
        return this.userLoginGeneratePasskeyUseCase.execute();
    }

    @Doc({ summary: 'login with passkey' })
    @Response('user.loginWithPasskey', { schema: UserLoginResponseSchema })
    @FeatureFlagProtected(EnumFeatureFlagKey.loginWithPasskey)
    @RequestThrottleProtected({ route: EnumRequestThrottleRoute.strict })
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/login/passkey')
    async loginWithPasskey(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @Body({ schema: UserLoginPasskeyRequestSchema })
        body: UserLoginPasskeyRequestDto
    ): Promise<IResponseReturn<IUserAuthTokenOutcome>> {
        return this.userLoginWithPasskeyUseCase.execute(
            requestContext,
            apiKeyContext,
            body
        );
    }
}
