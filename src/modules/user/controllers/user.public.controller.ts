import { Doc } from '@common/doc/decorators/doc.decorator';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { EnumRequestThrottleRoute } from '@common/request/enums/request.enum';
import { Response } from '@common/response/decorators/response.decorator';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtPayload } from '@modules/auth/decorators/auth.jwt.decorator';
import {
    AuthSocialAppleProtected,
    AuthSocialGoogleProtected,
} from '@modules/auth/decorators/auth.social.decorator';
import { AuthTokenResponseSchema } from '@modules/auth/dtos/response/auth.token.response.dto';
import type { IAuthSocialPayload } from '@modules/auth/interfaces/auth.interface';
import { FeatureFlagProtected } from '@modules/feature-flag/decorators/feature-flag.decorator';
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
import { UserAuthHttpService } from '@modules/user/services/user.auth.http.service';
import { UserPasswordHttpService } from '@modules/user/services/user.password.http.service';
import { UserTwoFactorHttpService } from '@modules/user/services/user.two-factor.http.service';
import { UserVerificationHttpService } from '@modules/user/services/user.verification.http.service';
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
        private readonly userAuthHttpService: UserAuthHttpService,
        private readonly userVerificationHttpService: UserVerificationHttpService,
        private readonly userPasswordHttpService: UserPasswordHttpService,
        private readonly userTwoFactorHttpService: UserTwoFactorHttpService
    ) {}

    @Doc({ summary: 'login with credential' })
    @Response('user.loginCredential', { schema: UserLoginResponseSchema })
    @FeatureFlagProtected('loginWithCredential')
    @ApiKeyProtected()
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @HttpCode(HttpStatus.OK)
    @Post('/login/credential')
    async loginWithCredential(
        @Body({ schema: UserLoginRequestSchema })
        body: UserLoginRequestDto
    ): Promise<IResponseReturn<IUserLoginOutcome>> {
        return this.userAuthHttpService.loginCredential(body);
    }

    @Doc({ summary: 'Login with social google' })
    @Response('user.loginWithSocialGoogle', {
        schema: UserLoginResponseSchema,
    })
    @AuthSocialGoogleProtected()
    @FeatureFlagProtected('loginWithGoogle')
    @ApiKeyProtected()
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @HttpCode(HttpStatus.OK)
    @Post('/login/social/google')
    async loginWithGoogle(
        @AuthJwtPayload<IAuthSocialPayload>('email')
        email: string,
        @Body({ schema: UserCreateSocialRequestSchema })
        body: UserCreateSocialRequestDto
    ): Promise<IResponseReturn<IUserLoginOutcome>> {
        return this.userAuthHttpService.loginWithSocial(
            email,
            EnumUserLoginWith.socialGoogle,
            body
        );
    }

    @Doc({ summary: 'Login with social apple' })
    @Response('user.loginWithSocialApple', {
        schema: UserLoginResponseSchema,
    })
    @AuthSocialAppleProtected()
    @FeatureFlagProtected('loginWithApple')
    @ApiKeyProtected()
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @HttpCode(HttpStatus.OK)
    @Post('/login/social/apple')
    async loginWithApple(
        @AuthJwtPayload<IAuthSocialPayload>('email')
        email: string,
        @Body({ schema: UserCreateSocialRequestSchema })
        body: UserCreateSocialRequestDto
    ): Promise<IResponseReturn<IUserLoginOutcome>> {
        return this.userAuthHttpService.loginWithSocial(
            email,
            EnumUserLoginWith.socialApple,
            body
        );
    }

    @Doc({ summary: 'User sign up' })
    @Response('user.signUp')
    @FeatureFlagProtected('signUp')
    @ApiKeyProtected()
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @Post('/sign-up')
    async signUp(
        @Body({ schema: UserSignUpRequestSchema })
        body: UserSignUpRequestDto
    ): Promise<void> {
        await this.userAuthHttpService.signUp(body);
    }

    @Doc({ summary: 'User Email Verification' })
    @Response('user.verifyEmail')
    @ApiKeyProtected()
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @Patch('/email/verify')
    async verifyEmail(
        @Body({ schema: UserVerifyEmailRequestSchema })
        body: UserVerifyEmailRequestDto
    ): Promise<void> {
        await this.userVerificationHttpService.verifyEmail(body);
    }

    @Doc({ summary: 'User resend email verification' })
    @Response('user.sendEmailVerification')
    @ApiKeyProtected()
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @HttpCode(HttpStatus.OK)
    @Post('/email/send')
    async sendEmailVerification(
        @Body({ schema: UserSendEmailVerificationRequestSchema })
        body: UserSendEmailVerificationRequestDto
    ): Promise<void> {
        await this.userVerificationHttpService.sendVerificationEmail(body);
    }

    @Doc({ summary: 'User forgot password' })
    @Response('user.forgotPassword')
    @FeatureFlagProtected('changePassword')
    @ApiKeyProtected()
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @HttpCode(HttpStatus.OK)
    @Post('/password/forgot')
    async forgotPassword(
        @Body({ schema: UserForgotPasswordRequestSchema })
        body: UserForgotPasswordRequestDto
    ): Promise<void> {
        await this.userPasswordHttpService.forgotPassword(body);
    }

    @Doc({ summary: 'User reset password' })
    @Response('user.resetPassword')
    @FeatureFlagProtected('changePassword')
    @ApiKeyProtected()
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @Patch('/password/reset')
    async reset(
        @Body({ schema: UserForgotPasswordResetRequestSchema })
        body: UserForgotPasswordResetRequestDto
    ): Promise<void> {
        await this.userPasswordHttpService.resetPassword(body);
    }

    @Doc({ summary: 'User verify two factor during login' })
    @Response('user.verifyTwoFactor', { schema: AuthTokenResponseSchema })
    @ApiKeyProtected()
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @Patch('/login/2fa/verify')
    async loginVerifyTwoFactor(
        @Body({ schema: UserLoginVerifyTwoFactorRequestSchema })
        body: UserLoginVerifyTwoFactorRequestDto
    ): Promise<IResponseReturn<IAuthToken>> {
        return this.userTwoFactorHttpService.loginVerifyTwoFactor(body);
    }

    @Doc({
        summary:
            'User enable two factor during login after reset by admin. Required setup 2FA flow',
    })
    @Response('user.loginSetupTwoFactor', {
        schema: UserTwoFactorEnableResponseSchema,
    })
    @ApiKeyProtected()
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @HttpCode(HttpStatus.OK)
    @Post('/login/2fa/enable')
    async verifyLoginTwoFactor(
        @Body({ schema: UserLoginSetupTwoFactorRequestSchema })
        body: UserLoginSetupTwoFactorRequestDto
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        return this.userTwoFactorHttpService.loginSetupTwoFactor(body);
    }
}
