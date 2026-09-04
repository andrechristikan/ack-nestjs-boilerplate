import { RequestThrottle } from '@common/request/decorators/request.throttler.decorator';
import { EnumRequestThrottleRoute } from '@common/request/enums/request.enum';
import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtPayload } from '@modules/auth/decorators/auth.jwt.decorator';
import {
    AuthSocialAppleProtected,
    AuthSocialGoogleProtected,
} from '@modules/auth/decorators/auth.social.decorator';
import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import { IAuthSocialPayload } from '@modules/auth/interfaces/auth.interface';
import { FeatureFlagProtected } from '@modules/feature-flag/decorators/feature-flag.decorator';
import {
    AuthPublicLoginSocialAppleDoc,
    AuthPublicLoginSocialGoogleDoc,
    UserPublicForgotPasswordDoc,
    UserPublicLoginCredentialDoc,
    UserPublicLoginSetupTwoFactorDoc,
    UserPublicLoginVerifyTwoFactorDoc,
    UserPublicResetPasswordDoc,
    UserPublicSendEmailVerificationDoc,
    UserPublicSignUpDoc,
    UserPublicVerifyEmailDoc,
} from '@modules/user/docs/user.public.doc';
import { UserCreateSocialRequestDto } from '@modules/user/dtos/request/user.create-social.request.dto';
import { UserForgotPasswordResetRequestDto } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';
import { UserForgotPasswordRequestDto } from '@modules/user/dtos/request/user.forgot-password.request.dto';
import { UserLoginSetupTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-setup-two-factor.request.dto';
import { UserLoginVerifyTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';
import { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import { UserSendEmailVerificationRequestDto } from '@modules/user/dtos/request/user.send-email-verification.request.dto';
import { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import { UserVerifyEmailRequestDto } from '@modules/user/dtos/request/user.verify-email.request.dto';
import { UserLoginResponseDto } from '@modules/user/dtos/response/user.login.response.dto';
import { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
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
import { EnumUserLoginWith } from '@generated/prisma-client';

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

    @UserPublicLoginCredentialDoc()
    @Response('user.loginCredential')
    @FeatureFlagProtected('loginWithCredential')
    @ApiKeyProtected()
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @HttpCode(HttpStatus.OK)
    @Post('/login/credential')
    async loginWithCredential(
        @Body() body: UserLoginRequestDto
    ): Promise<IResponseReturn<UserLoginResponseDto>> {
        return this.userAuthHttpService.loginCredential(body);
    }

    @AuthPublicLoginSocialGoogleDoc()
    @Response('user.loginWithSocialGoogle')
    @AuthSocialGoogleProtected()
    @FeatureFlagProtected('loginWithGoogle')
    @ApiKeyProtected()
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @HttpCode(HttpStatus.OK)
    @Post('/login/social/google')
    async loginWithGoogle(
        @AuthJwtPayload<IAuthSocialPayload>('email')
        email: string,
        @Body() body: UserCreateSocialRequestDto
    ): Promise<IResponseReturn<UserLoginResponseDto>> {
        return this.userAuthHttpService.loginWithSocial(
            email,
            EnumUserLoginWith.socialGoogle,
            body
        );
    }

    @AuthPublicLoginSocialAppleDoc()
    @Response('user.loginWithSocialApple')
    @AuthSocialAppleProtected()
    @FeatureFlagProtected('loginWithApple')
    @ApiKeyProtected()
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @HttpCode(HttpStatus.OK)
    @Post('/login/social/apple')
    async loginWithApple(
        @AuthJwtPayload<IAuthSocialPayload>('email')
        email: string,
        @Body() body: UserCreateSocialRequestDto
    ): Promise<IResponseReturn<UserLoginResponseDto>> {
        return this.userAuthHttpService.loginWithSocial(
            email,
            EnumUserLoginWith.socialApple,
            body
        );
    }

    @UserPublicSignUpDoc()
    @Response('user.signUp')
    @FeatureFlagProtected('signUp')
    @ApiKeyProtected()
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @Post('/sign-up')
    async signUp(
        @Body()
        body: UserSignUpRequestDto
    ): Promise<void> {
        await this.userAuthHttpService.signUp(body);
    }

    @UserPublicVerifyEmailDoc()
    @Response('user.verifyEmail')
    @ApiKeyProtected()
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @Patch('/email/verify')
    async verifyEmail(@Body() body: UserVerifyEmailRequestDto): Promise<void> {
        await this.userVerificationHttpService.verifyEmail(body);
    }

    @UserPublicSendEmailVerificationDoc()
    @Response('user.sendEmailVerification')
    @ApiKeyProtected()
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @HttpCode(HttpStatus.OK)
    @Post('/email/send')
    async sendEmailVerification(
        @Body() body: UserSendEmailVerificationRequestDto
    ): Promise<void> {
        await this.userVerificationHttpService.sendVerificationEmail(body);
    }

    @UserPublicForgotPasswordDoc()
    @Response('user.forgotPassword')
    @FeatureFlagProtected('changePassword')
    @ApiKeyProtected()
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @HttpCode(HttpStatus.OK)
    @Post('/password/forgot')
    async forgotPassword(
        @Body() body: UserForgotPasswordRequestDto
    ): Promise<void> {
        await this.userPasswordHttpService.forgotPassword(body);
    }

    @UserPublicResetPasswordDoc()
    @Response('user.resetPassword')
    @FeatureFlagProtected('changePassword')
    @ApiKeyProtected()
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @Patch('/password/reset')
    async reset(
        @Body() body: UserForgotPasswordResetRequestDto
    ): Promise<void> {
        await this.userPasswordHttpService.resetPassword(body);
    }

    @UserPublicLoginVerifyTwoFactorDoc()
    @Response('user.verifyTwoFactor')
    @ApiKeyProtected()
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @Patch('/login/2fa/verify')
    async loginVerifyTwoFactor(
        @Body() body: UserLoginVerifyTwoFactorRequestDto
    ): Promise<IResponseReturn<AuthTokenResponseDto>> {
        return this.userTwoFactorHttpService.loginVerifyTwoFactor(body);
    }

    @UserPublicLoginSetupTwoFactorDoc()
    @Response('user.loginSetupTwoFactor')
    @ApiKeyProtected()
    @RequestThrottle({ route: EnumRequestThrottleRoute.strict })
    @HttpCode(HttpStatus.OK)
    @Post('/login/2fa/enable')
    async verifyLoginTwoFactor(
        @Body() body: UserLoginSetupTwoFactorRequestDto
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        return this.userTwoFactorHttpService.loginSetupTwoFactor(body);
    }
}
