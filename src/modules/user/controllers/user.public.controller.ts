import {
    RequestGeoLocation,
    RequestIPAddress,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
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
import { UserService } from '@modules/user/services/user.service';
import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Patch,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    EnumUserLoginWith,
    GeoLocation,
    UserAgent,
} from '@generated/prisma-client';

@ApiTags('modules.public.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserPublicController {
    constructor(private readonly userService: UserService) {}

    @UserPublicLoginCredentialDoc()
    @Response('user.loginCredential')
    @FeatureFlagProtected('loginWithCredential')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/login/credential')
    async loginWithCredential(
        @Body() body: UserLoginRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: UserAgent,
        @RequestGeoLocation() geoLocation: GeoLocation | null
    ): Promise<IResponseReturn<UserLoginResponseDto>> {
        return this.userService.loginCredential(body, {
            ipAddress,
            userAgent,
            geoLocation,
        });
    }

    @AuthPublicLoginSocialGoogleDoc()
    @Response('user.loginWithSocialGoogle')
    @AuthSocialGoogleProtected()
    @FeatureFlagProtected('loginWithGoogle')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/login/social/google')
    async loginWithGoogle(
        @AuthJwtPayload<IAuthSocialPayload>('email')
        email: string,
        @Body() body: UserCreateSocialRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: UserAgent,
        @RequestGeoLocation() geoLocation: GeoLocation | null
    ): Promise<IResponseReturn<UserLoginResponseDto>> {
        return this.userService.loginWithSocial(
            email,
            EnumUserLoginWith.socialGoogle,
            body,
            {
                ipAddress,
                userAgent,
                geoLocation,
            }
        );
    }

    @AuthPublicLoginSocialAppleDoc()
    @Response('user.loginWithSocialApple')
    @AuthSocialAppleProtected()
    @FeatureFlagProtected('loginWithApple')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/login/social/apple')
    async loginWithApple(
        @AuthJwtPayload<IAuthSocialPayload>('email')
        email: string,
        @Body() body: UserCreateSocialRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: UserAgent,
        @RequestGeoLocation() geoLocation: GeoLocation | null
    ): Promise<IResponseReturn<UserLoginResponseDto>> {
        return this.userService.loginWithSocial(
            email,
            EnumUserLoginWith.socialApple,
            body,
            {
                ipAddress,
                userAgent,
                geoLocation,
            }
        );
    }

    @UserPublicSignUpDoc()
    @Response('user.signUp')
    @FeatureFlagProtected('signUp')
    @ApiKeyProtected()
    @Post('/sign-up')
    async signUp(
        @Body()
        body: UserSignUpRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: UserAgent,
        @RequestGeoLocation() geoLocation: GeoLocation | null
    ): Promise<IResponseReturn<void>> {
        return this.userService.signUp(body, {
            ipAddress,
            userAgent,
            geoLocation,
        });
    }

    @UserPublicVerifyEmailDoc()
    @Response('user.verifyEmail')
    @ApiKeyProtected()
    @Patch('/verify/email')
    async verifyEmail(
        @Body() body: UserVerifyEmailRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: UserAgent,
        @RequestGeoLocation() geoLocation: GeoLocation | null
    ): Promise<IResponseReturn<void>> {
        return this.userService.verifyEmail(body, {
            ipAddress,
            userAgent,
            geoLocation,
        });
    }

    @UserPublicSendEmailVerificationDoc()
    @Response('user.sendEmailVerification')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/send/email')
    async sendEmailVerification(
        @Body() body: UserSendEmailVerificationRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: UserAgent,
        @RequestGeoLocation() geoLocation: GeoLocation | null
    ): Promise<IResponseReturn<void>> {
        return this.userService.sendVerificationEmail(body, {
            ipAddress,
            userAgent,
            geoLocation,
        });
    }

    @UserPublicForgotPasswordDoc()
    @Response('user.forgotPassword')
    @FeatureFlagProtected('changePassword.forgotAllowed')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/password/forgot')
    async forgotPassword(
        @Body() body: UserForgotPasswordRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: UserAgent,
        @RequestGeoLocation() geoLocation: GeoLocation | null
    ): Promise<IResponseReturn<void>> {
        return this.userService.forgotPassword(body, {
            ipAddress,
            userAgent,
            geoLocation,
        });
    }

    @UserPublicResetPasswordDoc()
    @Response('user.resetPassword')
    @FeatureFlagProtected('changePassword.forgotAllowed')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Patch('/password/reset')
    async reset(
        @Body() body: UserForgotPasswordResetRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: UserAgent,
        @RequestGeoLocation() geoLocation: GeoLocation | null
    ): Promise<IResponseReturn<void>> {
        return this.userService.resetPassword(body, {
            ipAddress,
            userAgent,
            geoLocation,
        });
    }

    @UserPublicLoginVerifyTwoFactorDoc()
    @Response('user.verifyTwoFactor')
    @ApiKeyProtected()
    @Patch('/login/2fa/verify')
    async loginVerifyTwoFactor(
        @Body() body: UserLoginVerifyTwoFactorRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: UserAgent,
        @RequestGeoLocation() geoLocation: GeoLocation | null
    ): Promise<IResponseReturn<AuthTokenResponseDto>> {
        return this.userService.loginVerifyTwoFactor(body, {
            ipAddress,
            userAgent,
            geoLocation,
        });
    }

    @UserPublicLoginSetupTwoFactorDoc()
    @Response('user.loginSetupTwoFactor')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/login/2fa/enable')
    async verifyLoginTwoFactor(
        @Body() body: UserLoginSetupTwoFactorRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: UserAgent,
        @RequestGeoLocation() geoLocation: GeoLocation | null
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        return this.userService.loginSetupTwoFactor(body, {
            ipAddress,
            userAgent,
            geoLocation,
        });
    }
}
