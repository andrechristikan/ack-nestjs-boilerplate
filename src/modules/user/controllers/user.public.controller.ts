import { Doc } from '@common/doc/decorators/doc.decorator';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { EnumRequestThrottleRoute } from '@common/request/enums/request.enum';
import { Response } from '@common/response/decorators/response.decorator';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtPayload } from '@modules/auth/decorators/auth.jwt.decorator';
import {
    AuthSocialAppleProtected,
    AuthSocialGithubProtected,
    AuthSocialGoogleProtected,
} from '@modules/auth/decorators/auth.social.decorator';
import { AuthTokenResponseSchema } from '@modules/auth/dtos/response/auth.token.response.dto';
import type { IAuthSocialPayload } from '@modules/auth/interfaces/auth.interface';
import { FeatureFlagProtected } from '@modules/feature-flag/decorators/feature-flag.decorator';
import { EnumFeatureFlagKey } from '@modules/feature-flag/enums/feature-flag.enum';
import { UserCreateGithubRequestSchema } from '@modules/user/dtos/request/user.create-github.request.dto';
import type { UserCreateGithubRequestDto } from '@modules/user/dtos/request/user.create-github.request.dto';
import { UserCreateSocialRequestSchema } from '@modules/user/dtos/request/user.create-social.request.dto';
import type { UserCreateSocialRequestDto } from '@modules/user/dtos/request/user.create-social.request.dto';
import { UserForgotPasswordResetRequestSchema } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';
import type { UserForgotPasswordResetRequestDto } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';
import { UserForgotPasswordRequestSchema } from '@modules/user/dtos/request/user.forgot-password.request.dto';
import type { UserForgotPasswordRequestDto } from '@modules/user/dtos/request/user.forgot-password.request.dto';
import { UserLoginSetupTwoFactorRequestSchema } from '@modules/user/dtos/request/user.login-setup-two-factor.request.dto';
import type { UserLoginSetupTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-setup-two-factor.request.dto';
import { UserLoginVerifyTwoFactorRequestSchema } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';
import type { UserLoginVerifyTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';
import { UserLoginRequestSchema } from '@modules/user/dtos/request/user.login.request.dto';
import type { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import { UserSendEmailVerificationRequestSchema } from '@modules/user/dtos/request/user.send-email-verification.request.dto';
import type { UserSendEmailVerificationRequestDto } from '@modules/user/dtos/request/user.send-email-verification.request.dto';
import { UserSignUpRequestSchema } from '@modules/user/dtos/request/user.sign-up.request.dto';
import type { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import { UserVerifyEmailRequestSchema } from '@modules/user/dtos/request/user.verify-email.request.dto';
import type { UserVerifyEmailRequestDto } from '@modules/user/dtos/request/user.verify-email.request.dto';
import { UserLoginResponseSchema } from '@modules/user/dtos/response/user.login.response.dto';
import { UserTwoFactorEnableResponseSchema } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import type { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import type { IUserLoginOutcome } from '@modules/user/interfaces/user.interface';
import { UserLoginCredentialUseCase } from '@modules/user/use-cases/user.login-credential.use-case';
import { UserLoginWithSocialUseCase } from '@modules/user/use-cases/user.login-with-social.use-case';
import { UserSignUpUseCase } from '@modules/user/use-cases/user.sign-up.use-case';
import { UserVerifyEmailUseCase } from '@modules/user/use-cases/user.verify-email.use-case';
import { UserSendVerificationEmailUseCase } from '@modules/user/use-cases/user.send-verification-email.use-case';
import { UserForgotPasswordUseCase } from '@modules/user/use-cases/user.forgot-password.use-case';
import { UserResetPasswordUseCase } from '@modules/user/use-cases/user.reset-password.use-case';
import { UserLoginVerifyTwoFactorUseCase } from '@modules/user/use-cases/user.login-verify-two-factor.use-case';
import { UserLoginSetupTwoFactorUseCase } from '@modules/user/use-cases/user.login-setup-two-factor.use-case';
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
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';

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
        private readonly userLoginVerifyTwoFactorUseCase: UserLoginVerifyTwoFactorUseCase,
        private readonly userLoginSetupTwoFactorUseCase: UserLoginSetupTwoFactorUseCase
    ) {}

    @Doc({ summary: 'login with credential' })
    @Response('user.loginCredential', { schema: UserLoginResponseSchema })
    @FeatureFlagProtected(EnumFeatureFlagKey.loginWithCredential)
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/login/credential')
    async loginWithCredential(
        @Body({ schema: UserLoginRequestSchema })
        body: UserLoginRequestDto
    ): Promise<IResponseReturn<IUserLoginOutcome>> {
        return this.userLoginCredentialUseCase.execute(body);
    }

    @Doc({ summary: 'login with social google' })
    @Response('user.loginWithSocialGoogle', {
        schema: UserLoginResponseSchema,
    })
    @AuthSocialGoogleProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.loginWithGoogle)
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/login/social/google')
    async loginWithGoogle(
        @AuthJwtPayload<IAuthSocialPayload>('email')
        email: string,
        @Body({ schema: UserCreateSocialRequestSchema })
        body: UserCreateSocialRequestDto
    ): Promise<IResponseReturn<IUserLoginOutcome>> {
        return this.userLoginWithSocialUseCase.execute(
            email,
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
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/login/social/apple')
    async loginWithApple(
        @AuthJwtPayload<IAuthSocialPayload>('email')
        email: string,
        @Body({ schema: UserCreateSocialRequestSchema })
        body: UserCreateSocialRequestDto
    ): Promise<IResponseReturn<IUserLoginOutcome>> {
        return this.userLoginWithSocialUseCase.execute(
            email,
            EnumUserLoginWith.socialApple,
            body
        );
    }

    @Doc({ summary: 'login with social github' })
    @Response('user.loginWithSocialGithub', {
        schema: UserLoginResponseSchema,
    })
    @AuthSocialGithubProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.loginWithGithub)
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/login/social/github')
    async loginWithGithub(
        @AuthJwtPayload<IAuthSocialPayload>('email')
        email: string,
        @Body({ schema: UserCreateGithubRequestSchema })
        body: UserCreateGithubRequestDto
    ): Promise<IResponseReturn<IUserLoginOutcome>> {
        return this.userLoginWithSocialUseCase.execute(
            email,
            EnumUserLoginWith.socialGithub,
            body
        );
    }

    @Doc({ summary: 'user sign up' })
    @Response('user.signUp')
    @FeatureFlagProtected(EnumFeatureFlagKey.signUp)
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @ApiKeyProtected()
    @Post('/sign-up')
    async signUp(
        @Body({ schema: UserSignUpRequestSchema })
        body: UserSignUpRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.userSignUpUseCase.execute(body);
    }

    @Doc({ summary: 'user email verification' })
    @Response('user.verifyEmail')
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @ApiKeyProtected()
    @Patch('/email/verify')
    async verifyEmail(
        @Body({ schema: UserVerifyEmailRequestSchema })
        body: UserVerifyEmailRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.userVerifyEmailUseCase.execute(body);
    }

    @Doc({ summary: 'user resend email verification' })
    @Response('user.sendEmailVerification')
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/email/send')
    async sendEmailVerification(
        @Body({ schema: UserSendEmailVerificationRequestSchema })
        body: UserSendEmailVerificationRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.userSendVerificationEmailUseCase.execute(body);
    }

    @Doc({ summary: 'user forgot password' })
    @Response('user.forgotPassword')
    @FeatureFlagProtected(EnumFeatureFlagKey.changePassword)
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/password/forgot')
    async forgotPassword(
        @Body({ schema: UserForgotPasswordRequestSchema })
        body: UserForgotPasswordRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.userForgotPasswordUseCase.execute(body);
    }

    @Doc({ summary: 'user reset password' })
    @Response('user.resetPassword')
    @FeatureFlagProtected(EnumFeatureFlagKey.changePassword)
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @ApiKeyProtected()
    @Patch('/password/reset')
    async reset(
        @Body({ schema: UserForgotPasswordResetRequestSchema })
        body: UserForgotPasswordResetRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.userResetPasswordUseCase.execute(body);
    }

    @Doc({ summary: 'user verify two factor during login' })
    @Response('user.verifyTwoFactor', { schema: AuthTokenResponseSchema })
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @ApiKeyProtected()
    @Patch('/login/2fa/verify')
    async loginVerifyTwoFactor(
        @Body({ schema: UserLoginVerifyTwoFactorRequestSchema })
        body: UserLoginVerifyTwoFactorRequestDto
    ): Promise<IResponseReturn<IAuthToken>> {
        return this.userLoginVerifyTwoFactorUseCase.execute(body);
    }

    @Doc({
        summary:
            'user enable two factor during login after reset by admin. Required setup 2FA flow',
    })
    @Response('user.loginSetupTwoFactor', {
        schema: UserTwoFactorEnableResponseSchema,
    })
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/login/2fa/enable')
    async verifyLoginTwoFactor(
        @Body({ schema: UserLoginSetupTwoFactorRequestSchema })
        body: UserLoginSetupTwoFactorRequestDto
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        return this.userLoginSetupTwoFactorUseCase.execute(body);
    }
}
