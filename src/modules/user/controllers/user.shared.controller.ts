import { AwsS3PresignDto } from '@common/aws/dtos/aws.s3-presign.dto';
import { FileUploadSingle } from '@common/file/decorators/file.decorator';
import { EnumFileExtensionImage } from '@common/file/enums/file.enum';
import { IFile } from '@common/file/interfaces/file.interface';
import { FileExtensionPipe } from '@common/file/pipes/file.extension.pipe';
import {
    RequestIPAddress,
    RequestTimeout,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import { RequestUserAgentDto } from '@common/request/dtos/request.user-agent.dto';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
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
import { FeatureFlagProtected } from '@modules/feature-flag/decorators/feature-flag.decorator';
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
    UserSharedGeneratePhotoProfilePresignDoc,
    UserSharedProfileDoc,
    UserSharedRefreshDoc,
    UserSharedTwoFactorDisableDoc,
    UserSharedTwoFactorEnableDoc,
    UserSharedTwoFactorRegenerateBackupDoc,
    UserSharedTwoFactorSetupDoc,
    UserSharedTwoFactorStatusDoc,
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
import { UserTwoFactorDisableRequestDto } from '@modules/user/dtos/request/user.two-factor-disable.request.dto';
import { UserTwoFactorEnableRequestDto } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';
import { UserProfileResponseDto } from '@modules/user/dtos/response/user.profile.response.dto';
import { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import { UserTwoFactorSetupResponseDto } from '@modules/user/dtos/response/user.two-factor-setup.response.dto';
import { UserTwoFactorStatusResponseDto } from '@modules/user/dtos/response/user.two-factor-status.response.dto';
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
        @AuthJwtToken() refreshToken: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<AuthTokenResponseDto>> {
        return this.userService.refreshToken(user, refreshToken, {
            ipAddress,
            userAgent,
        });
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

    @UserSharedGeneratePhotoProfilePresignDoc()
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
            RequestRequiredPipe,
            FileExtensionPipe([
                EnumFileExtensionImage.jpeg,
                EnumFileExtensionImage.png,
                EnumFileExtensionImage.jpg,
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
    @FeatureFlagProtected('changePassword')
    @ApiKeyProtected()
    @Patch('/change-password')
    async changePassword(
        @UserCurrent() user: IUser,
        @Body() body: UserChangePasswordRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.userService.changePassword(user, body, {
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
        @Body()
        body: UserAddMobileNumberRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
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
        @Body()
        body: UserUpdateMobileNumberRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
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

    @UserSharedTwoFactorStatusDoc()
    @Response('user.twoFactor.status')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/2fa/status')
    async getTwoFactorStatus(
        @UserCurrent() user: IUser
    ): Promise<IResponseReturn<UserTwoFactorStatusResponseDto>> {
        return this.userService.getTwoFactorStatus(user);
    }

    @UserSharedTwoFactorSetupDoc()
    @Response('user.twoFactor.setup')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/2fa/setup')
    async setupTwoFactor(
        @UserCurrent() user: IUser,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<UserTwoFactorSetupResponseDto>> {
        return this.userService.setupTwoFactor(user, {
            ipAddress,
            userAgent,
        });
    }

    @UserSharedTwoFactorEnableDoc()
    @Response('user.twoFactor.enable')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/2fa/enable')
    async enableTwoFactor(
        @UserCurrent() user: IUser,
        @Body() body: UserTwoFactorEnableRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        return this.userService.enableTwoFactor(user, body, {
            ipAddress,
            userAgent,
        });
    }

    @UserSharedTwoFactorDisableDoc()
    @Response('user.twoFactor.disable')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Delete('/2fa/disable')
    async disableTwoFactor(
        @UserCurrent() user: IUser,
        @Body() body: UserTwoFactorDisableRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.userService.disableTwoFactor(user, body, {
            ipAddress,
            userAgent,
        });
    }

    @UserSharedTwoFactorRegenerateBackupDoc()
    @Response('user.twoFactor.regenerateBackupCodes')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/2fa/regenerate-backup-codes')
    async regenerateTwoFactorBackupCodes(
        @UserCurrent() user: IUser,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        return this.userService.regenerateTwoFactorBackupCodes(user, {
            ipAddress,
            userAgent,
        });
    }

    // TODO: Verify number implementation, but which provider?
}
