import {
    RequestIPAddress,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import { RequestUserAgentDto } from '@common/request/dtos/request.user-agent.dto';
import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtPayload } from '@modules/auth/decorators/auth.jwt.decorator';
import {
    AuthSocialAppleProtected,
    AuthSocialGoogleProtected,
} from '@modules/auth/decorators/auth.social.decorator';
import { IAuthSocialPayload } from '@modules/auth/interfaces/auth.interface';
import { FeatureFlag } from '@modules/feature-flag/decorators/feature-flag.decorator';
import {
    AuthPublicLoginSocialAppleDoc,
    AuthPublicLoginSocialGoogleDoc,
    UserPublicForgotPasswordDoc,
    UserPublicLoginCredentialDoc,
    UserPublicResetPasswordDoc,
    UserPublicSignUpDoc,
    UserPublicVerifyEmailDoc,
} from '@modules/user/docs/user.public.doc';
import { UserCreateSocialRequestDto } from '@modules/user/dtos/request/user.create-social.request.dto';
import { UserForgotPasswordResetRequestDto } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';
import { UserForgotPasswordRequestDto } from '@modules/user/dtos/request/user.forgot-password.request.dto';
import { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import { UserVerifyEmailRequestDto } from '@modules/user/dtos/request/user.verify-email.request.dto';
import { UserTokenResponseDto } from '@modules/user/dtos/response/user.token.response.dto';
import { UserService } from '@modules/user/services/user.service';
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ENUM_USER_LOGIN_WITH } from '@prisma/client';

@ApiTags('modules.public.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserPublicController {
    constructor(private readonly userService: UserService) {}

    @UserPublicLoginCredentialDoc()
    @Response('user.loginCredential')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @FeatureFlag('loginWithCredential')
    @Post('/login/credential')
    async loginWithCredential(
        @Body() body: UserLoginRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<UserTokenResponseDto>> {
        return this.userService.loginCredential(body, {
            ipAddress,
            userAgent,
        });
    }

    @AuthPublicLoginSocialGoogleDoc()
    @Response('user.loginWithSocialGoogle')
    @AuthSocialGoogleProtected()
    @FeatureFlag('loginWithGoogle')
    @Post('/login/social/google')
    async loginWithGoogle(
        @AuthJwtPayload<IAuthSocialPayload>('email')
        email: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto,
        @Body() body: UserCreateSocialRequestDto
    ): Promise<IResponseReturn<UserTokenResponseDto>> {
        return this.userService.loginWithSocial(
            email,
            ENUM_USER_LOGIN_WITH.socialGoogle,
            body,
            {
                ipAddress,
                userAgent,
            }
        );
    }

    @AuthPublicLoginSocialAppleDoc()
    @Response('user.loginWithSocialApple')
    @AuthSocialAppleProtected()
    @FeatureFlag('loginWithApple')
    @Post('/login/social/apple')
    async loginWithApple(
        @AuthJwtPayload<IAuthSocialPayload>('email')
        email: string,
        @Body() body: UserCreateSocialRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<UserTokenResponseDto>> {
        return this.userService.loginWithSocial(
            email,
            ENUM_USER_LOGIN_WITH.socialApple,
            body,
            {
                ipAddress,
                userAgent,
            }
        );
    }

    @UserPublicSignUpDoc()
    @Response('user.signUp')
    @FeatureFlag('signUp')
    @ApiKeyProtected()
    @Post('/sign-up')
    async signUp(
        @Body()
        body: UserSignUpRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<void> {
        return this.userService.signUp(body, {
            ipAddress,
            userAgent,
        });
    }

    @UserPublicVerifyEmailDoc()
    @Response('user.verifyEmail')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/verify/email')
    async verifyEmail(
        @Body() body: UserVerifyEmailRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.userService.verifyEmail(body, {
            ipAddress,
            userAgent,
        });
    }

    @UserPublicForgotPasswordDoc()
    @Response('user.forgotPassword')
    @FeatureFlag('changePassword.forgotAllowed')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/password/forgot')
    async forgotPassword(
        @Body() body: UserForgotPasswordRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.userService.forgotPassword(body, {
            ipAddress,
            userAgent,
        });
    }

    @UserPublicResetPasswordDoc()
    @Response('user.resetPassword')
    @FeatureFlag('changePassword.forgotAllowed')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/password/reset')
    async reset(
        @Body() body: UserForgotPasswordResetRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.userService.resetPassword(body, {
            ipAddress,
            userAgent,
        });
    }
}
