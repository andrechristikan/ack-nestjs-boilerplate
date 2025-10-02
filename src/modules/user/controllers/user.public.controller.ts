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
import {
    AuthPublicLoginSocialAppleDoc,
    AuthPublicLoginSocialGoogleDoc,
    UserPublicLoginCredentialDoc,
    UserPublicSignUpDoc,
} from '@modules/user/docs/user.public.doc';
import { UserCreateSocialRequestDto } from '@modules/user/dtos/request/user.create-social.request.dto';
import { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
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
    @Post('/login/credential')
    async loginWithCredential(
        @Body() data: UserLoginRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<UserTokenResponseDto>> {
        return this.userService.loginCredential(data, {
            ipAddress,
            userAgent,
        });
    }

    @AuthPublicLoginSocialGoogleDoc()
    @Response('user.loginWithSocialGoogle')
    @AuthSocialGoogleProtected()
    // @SettingFeatureFlag('auth.social.google') // TODO: NEXT- Enable this
    @Post('/login/social/google')
    async loginWithGoogle(
        @AuthJwtPayload<IAuthSocialPayload>('email')
        email: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto,
        @Body() data: UserCreateSocialRequestDto
    ): Promise<IResponseReturn<UserTokenResponseDto>> {
        return this.userService.loginWithSocial(
            email,
            ENUM_USER_LOGIN_WITH.SOCIAL_GOOGLE,
            data,
            {
                ipAddress,
                userAgent,
            }
        );
    }

    @AuthPublicLoginSocialAppleDoc()
    @Response('user.loginWithSocialApple')
    @AuthSocialAppleProtected()
    // @SettingFeatureFlag('auth.social.apple') // TODO: NEXT- Enable this
    @Post('/login/social/apple')
    async loginWithApple(
        @AuthJwtPayload<IAuthSocialPayload>('email')
        email: string,
        @Body() data: UserCreateSocialRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<UserTokenResponseDto>> {
        return this.userService.loginWithSocial(
            email,
            ENUM_USER_LOGIN_WITH.SOCIAL_APPLE,
            data,
            {
                ipAddress,
                userAgent,
            }
        );
    }

    @UserPublicSignUpDoc()
    @Response('user.signUp')
    @ApiKeyProtected()
    @Post('/sign-up')
    async signUp(
        @Body()
        data: UserSignUpRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<void> {
        return this.userService.signUp(data, {
            ipAddress,
            userAgent,
        });
    }

    // TODO: NEXT
    // handle forgot password
    // handle reset password
}
