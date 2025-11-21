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
    UserSharedAddMobileNumberDoc,
    UserSharedChangePasswordDoc,
    UserSharedClaimUsernameDoc,
    UserSharedDeleteMobileNumberDoc,
    UserSharedGeneratePhotoProfileDoc,
    UserSharedProfileDoc,
    UserSharedRefreshDoc,
    UserSharedUpdateMobileNumberDoc,
    UserSharedUpdatePhotoProfileDoc,
    UserSharedUpdateProfileDoc,
    UserSharedUploadPhotoProfileDoc,
} from '@modules/user/docs/user.shared.doc';
import { UserChangePasswordRequestDto } from '@modules/user/dtos/request/user.change-password.request.dto';
import { UserClaimUsernameRequestDto } from '@modules/user/dtos/request/user.claim-username.request.dto';
import { UserGeneratePhotoProfileRequestDto } from '@modules/user/dtos/request/user.generate-photo-profile.request.dto';
import {
    UserAddMobileNumberRequestDto,
    UserUpdateMobileNumberRequestDto,
} from '@modules/user/dtos/request/user.mobile-number.request.dto';
import {
    UserUpdateProfilePhotoRequestDto,
    UserUpdateProfileRequestDto,
} from '@modules/user/dtos/request/user.profile.request.dto';
import { UserProfileResponseDto } from '@modules/user/dtos/response/user.profile.response.dto';
import { UserMobileNumberResponseDto } from '@modules/user/dtos/user.mobile-number.dto';
import { IUser } from '@modules/user/interfaces/user.interface';
import { UserService } from '@modules/user/services/user.service';
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Put,
    UploadedFile,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.shared.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserSharedController {
    constructor(private readonly userService: UserService) {}

    // TODO: IMPLEMENT ROTATING REFRESH TOKEN LATER
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
    @HttpCode(HttpStatus.OK)
    @Post('/profile/upload/photo')
    async uploadPhotoProfile(
        @AuthJwtPayload('userId')
        userId: string,
        @UploadedFile(
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

    @UserSharedAddMobileNumberDoc()
    @Response('user.addMobileNumber')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/mobile-number/add')
    async addMobileNumber(
        @AuthJwtPayload('userId') userId: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto,
        @Body()
        body: UserAddMobileNumberRequestDto
    ): Promise<IResponseReturn<UserMobileNumberResponseDto>> {
        return this.userService.addMobileNumber(userId, body, {
            ipAddress,
            userAgent,
        });
    }

    @UserSharedUpdateMobileNumberDoc()
    @Response('user.updateMobileNumber')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/mobile-number/update/:mobileNumberId')
    async updateMobileNumber(
        @AuthJwtPayload('userId') userId: string,
        @Param('mobileNumberId') mobileNumberId: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto,
        @Body()
        body: UserUpdateMobileNumberRequestDto
    ): Promise<IResponseReturn<UserMobileNumberResponseDto>> {
        return this.userService.updateMobileNumber(
            userId,
            mobileNumberId,
            body,
            {
                ipAddress,
                userAgent,
            }
        );
    }

    @UserSharedDeleteMobileNumberDoc()
    @Response('user.deleteMobileNumber')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/mobile-number/delete/:mobileNumberId')
    async deleteMobileNumber(
        @AuthJwtPayload('userId') userId: string,
        @Param('mobileNumberId') mobileNumberId: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<UserMobileNumberResponseDto>> {
        return this.userService.deleteMobileNumber(userId, mobileNumberId, {
            ipAddress,
            userAgent,
        });
    }

    // TODO: VERIFIED MOBILE NUMBER REQUIRED
    // WHICH PROVIDER ?

    @UserSharedClaimUsernameDoc()
    @Response('user.claimUsername')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/username/claim')
    async claimUsername(
        @AuthJwtPayload('userId') userId: string,
        @Body()
        body: UserClaimUsernameRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.userService.claimUsername(userId, body, {
            ipAddress,
            userAgent,
        });
    }
}
