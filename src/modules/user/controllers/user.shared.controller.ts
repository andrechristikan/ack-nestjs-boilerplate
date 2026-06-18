import { AwsS3PresignResponseDto } from '@common/aws/dtos/response/aws.s3-presign.response.dto';
import { FileUploadSingle } from '@common/file/decorators/file.decorator';
import { EnumFileExtensionImage } from '@common/file/enums/file.enum';
import { IFile } from '@common/file/interfaces/file.interface';
import { FileExtensionPipe } from '@common/file/pipes/file.extension.pipe';
import {
    RequestTimeout,
} from '@common/request/decorators/request.decorator';
import { RequestIsValidObjectIdPipe } from '@common/request/pipes/request.is-valid-object-id.pipe';
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
import { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
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
    UserSharedLogoutDoc,
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
        @AuthJwtToken() refreshToken: string
    ): Promise<IResponseReturn<AuthTokenResponseDto>> {
        return this.userService.refresh(user, refreshToken);
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
        body: UserUpdateProfileRequestDto
    ): Promise<void> {
        return this.userService.updateProfile(userId, body);
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
    ): Promise<IResponseReturn<AwsS3PresignResponseDto>> {
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
        @Body() body: UserUpdateProfilePhotoRequestDto
    ): Promise<void> {
        return this.userService.updatePhotoProfile(userId, body);
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
        file: IFile
    ): Promise<void> {
        return this.userService.uploadPhotoProfile(userId, file);
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
        @Body() body: UserChangePasswordRequestDto
    ): Promise<void> {
        return this.userService.changePassword(user, body);
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
        body: UserAddMobileNumberRequestDto
    ): Promise<IResponseReturn<UserMobileNumberResponseDto>> {
        return this.userService.addMobileNumber(userId, body);
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
        @Param(
            'mobileNumberId',
            RequestRequiredPipe,
            RequestIsValidObjectIdPipe
        )
        mobileNumberId: string,
        @Body()
        body: UserUpdateMobileNumberRequestDto
    ): Promise<IResponseReturn<UserMobileNumberResponseDto>> {
        return this.userService.updateMobileNumber(
            userId,
            mobileNumberId,
            body
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
        @Param(
            'mobileNumberId',
            RequestRequiredPipe,
            RequestIsValidObjectIdPipe
        )
        mobileNumberId: string
    ): Promise<IResponseReturn<UserMobileNumberResponseDto>> {
        return this.userService.deleteMobileNumber(userId, mobileNumberId);
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
        body: UserClaimUsernameRequestDto
    ): Promise<void> {
        return this.userService.claimUsername(userId, body);
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
        @UserCurrent() user: IUser
    ): Promise<IResponseReturn<UserTwoFactorSetupResponseDto>> {
        return this.userService.setupTwoFactor(user);
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
        @Body() body: UserTwoFactorEnableRequestDto
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        return this.userService.enableTwoFactor(user, body);
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
        @Body() body: UserTwoFactorDisableRequestDto
    ): Promise<void> {
        return this.userService.disableTwoFactor(user, body);
    }

    @UserSharedTwoFactorRegenerateBackupDoc()
    @Response('user.twoFactor.regenerateBackupCodes')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/2fa/regenerate-backup-codes')
    async regenerateTwoFactorBackupCodes(
        @UserCurrent() user: IUser
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        return this.userService.regenerateTwoFactorBackupCodes(user);
    }

    @UserSharedLogoutDoc()
    @Response('user.logout')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/logout')
    async logout(
        @AuthJwtPayload()
        { sessionId, userId, deviceOwnershipId }: IAuthJwtAccessTokenPayload
    ): Promise<void> {
        return this.userService.logout(userId, sessionId, deviceOwnershipId);
    }

    // TODO: Verify number implementation, but which provider?
}
