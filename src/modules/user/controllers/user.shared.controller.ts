import { AwsS3PresignDto } from '@common/aws/dtos/aws.s3-presign.dto';
import { FileUploadSingle } from '@common/file/decorators/file.decorator';
import { ENUM_FILE_EXTENSION_IMAGE } from '@common/file/enums/file.enum';
import { IFile } from '@common/file/interfaces/file.interface';
import { FileExtensionPipe } from '@common/file/pipes/file.extension.pipe';
import {
    RequestIPAddress,
    RequestTimeout,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import { RequestUserAgentDto } from '@common/request/dtos/request.user-agent.dto';
import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
    AuthJwtRefreshProtected,
    AuthJwtToken,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import { FeatureFlag } from '@modules/feature-flag/decorators/feature-flag.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import {
    UserCurrent,
    UserProtected,
} from '@modules/user/decorators/user.decorator';
import {
    UserSharedChangePasswordDoc,
    UserSharedGeneratePhotoProfileDoc,
    UserSharedProfileDoc,
    UserSharedRefreshDoc,
    UserSharedUpdatePhotoProfileDoc,
    UserSharedUpdateProfileDoc,
    UserSharedUploadPhotoProfileDoc,
} from '@modules/user/docs/user.shared.doc';
import { UserChangePasswordRequestDto } from '@modules/user/dtos/request/user.change-password.request.dto';
import { UserGeneratePhotoProfileRequestDto } from '@modules/user/dtos/request/user.generate-photo-profile.request.dto';
import {
    UserUpdateProfilePhotoRequestDto,
    UserUpdateProfileRequestDto,
} from '@modules/user/dtos/request/user.profile.request.dto';
import { UserProfileResponseDto } from '@modules/user/dtos/response/user.profile.response.dto';
import { IUser } from '@modules/user/interfaces/user.interface';
import { UserService } from '@modules/user/services/user.service';
import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Patch,
    Post,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.shared.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserSharedController {
    constructor(private readonly userService: UserService) {}

    @UserSharedRefreshDoc()
    @Response('user.refresh')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtRefreshProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/refresh')
    async refresh(
        @UserCurrent() user: IUser,
        @AuthJwtToken() refreshToken: string
    ): Promise<IResponseReturn<AuthTokenResponseDto>> {
        return this.userService.refreshToken(user, refreshToken);
    }

    @UserSharedProfileDoc()
    @Response('user.profile')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/profile')
    async profile(
        @AuthJwtPayload('userId')
        userId: string
    ): Promise<IResponseReturn<UserProfileResponseDto>> {
        return this.userService.getProfile(userId);
    }

    @UserSharedUpdateProfileDoc()
    @Response('user.updateProfile')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/profile/update')
    async updateProfile(
        @AuthJwtPayload('userId')
        userId: string,
        @Body()
        body: UserUpdateProfileRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.userService.updateProfile(userId, body, {
            ipAddress,
            userAgent,
        });
    }

    @UserSharedGeneratePhotoProfileDoc()
    @Response('user.generatePhotoProfilePresign')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/profile/generate-presign/photo')
    async generatePhotoProfilePresign(
        @AuthJwtPayload('userId')
        userId: string,
        @Body() body: UserGeneratePhotoProfileRequestDto
    ): Promise<IResponseReturn<AwsS3PresignDto>> {
        return this.userService.generatePhotoProfilePresign(userId, body);
    }

    @UserSharedUpdatePhotoProfileDoc()
    @Response('user.updatePhotoProfile')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/profile/update/photo')
    async updatePhotoProfile(
        @AuthJwtPayload('userId')
        userId: string,
        @Body() body: UserUpdateProfilePhotoRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.userService.updatePhotoProfile(userId, body, {
            ipAddress,
            userAgent,
        });
    }

    @UserSharedUploadPhotoProfileDoc()
    @Response('user.uploadPhotoProfile')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @FileUploadSingle()
    @RequestTimeout('1m')
    @Post('/profile/upload/photo')
    async uploadPhotoProfile(
        @AuthJwtPayload('userId')
        userId: string,
        @Body(
            'file',
            FileExtensionPipe([
                ENUM_FILE_EXTENSION_IMAGE.JPEG,
                ENUM_FILE_EXTENSION_IMAGE.PNG,
                ENUM_FILE_EXTENSION_IMAGE.JPG,
            ])
        )
        file: IFile,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.userService.uploadPhotoProfile(userId, file, {
            ipAddress,
            userAgent,
        });
    }

    @UserSharedChangePasswordDoc()
    @Response('user.changePassword')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @FeatureFlag('changePassword')
    @ApiKeyProtected()
    @Patch('/change-password')
    async changePassword(
        @Body() body: UserChangePasswordRequestDto,
        @AuthJwtPayload('userId') userId: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.userService.changePassword(userId, body, {
            ipAddress,
            userAgent,
        });
    }
}
