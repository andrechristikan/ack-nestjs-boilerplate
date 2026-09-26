import { Doc } from '@common/doc/decorators/doc.decorator';
import { AwsS3PresignResponseSchema } from '@common/aws/dtos/response/aws.s3-presign.response.dto';
import type { IAwsS3Presign } from '@common/aws/interfaces/aws.interface';
import { FileUploadSingle } from '@common/file/decorators/file.decorator';
import { EnumFileExtensionImage } from '@common/file/enums/file.enum';
import type { IFile } from '@common/file/interfaces/file.interface';
import { FileExtensionPipe } from '@common/file/pipes/file.extension.pipe';
import { FileRequiredPipe } from '@common/file/pipes/file.required.pipe';
import {
    RequestThrottle,
    RequestTimeout,
} from '@common/request/decorators/request.decorator';
import { EnumRequestThrottleRoute } from '@common/request/enums/request.enum';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import { Response } from '@common/response/decorators/response.decorator';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
    AuthJwtRefreshProtected,
    AuthJwtToken,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { AuthTokenResponseSchema } from '@modules/auth/dtos/response/auth.token.response.dto';
import type {
    IAuthJwtAccessTokenPayload,
    IAuthToken,
} from '@modules/auth/interfaces/auth.interface';
import { FeatureFlagProtected } from '@modules/feature-flag/decorators/feature-flag.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import {
    UserCurrent,
    UserProtected,
} from '@modules/user/decorators/user.decorator';
import { UserChangePasswordRequestSchema } from '@modules/user/dtos/request/user.change-password.request.dto';
import type { UserChangePasswordRequestDto } from '@modules/user/dtos/request/user.change-password.request.dto';
import { UserClaimUsernameRequestSchema } from '@modules/user/dtos/request/user.claim-username.request.dto';
import type { UserClaimUsernameRequestDto } from '@modules/user/dtos/request/user.claim-username.request.dto';
import { UserGeneratePhotoProfileRequestSchema } from '@modules/user/dtos/request/user.generate-photo-profile.request.dto';
import type { UserGeneratePhotoProfileRequestDto } from '@modules/user/dtos/request/user.generate-photo-profile.request.dto';
import { UserAddMobileNumberRequestSchema } from '@modules/user/dtos/request/user.add-mobile-number.request.dto';
import { UserUpdateMobileNumberRequestSchema } from '@modules/user/dtos/request/user.update-mobile-number.request.dto';
import type { UserAddMobileNumberRequestDto } from '@modules/user/dtos/request/user.add-mobile-number.request.dto';
import type { UserUpdateMobileNumberRequestDto } from '@modules/user/dtos/request/user.update-mobile-number.request.dto';
import { UserUpdateProfilePhotoRequestSchema } from '@modules/user/dtos/request/user.update-profile-photo.request.dto';
import { UserUpdateProfileRequestSchema } from '@modules/user/dtos/request/user.update-profile.request.dto';
import type { UserUpdateProfilePhotoRequestDto } from '@modules/user/dtos/request/user.update-profile-photo.request.dto';
import type { UserUpdateProfileRequestDto } from '@modules/user/dtos/request/user.update-profile.request.dto';
import { UserTwoFactorDisableRequestSchema } from '@modules/user/dtos/request/user.two-factor-disable.request.dto';
import type { UserTwoFactorDisableRequestDto } from '@modules/user/dtos/request/user.two-factor-disable.request.dto';
import { UserTwoFactorRegenerateBackupCodeRequestSchema } from '@modules/user/dtos/request/user.two-factor-regenerate-backup-code.request.dto';
import type { UserTwoFactorRegenerateBackupCodeRequestDto } from '@modules/user/dtos/request/user.two-factor-regenerate-backup-code.request.dto';
import { UserTwoFactorEnableRequestSchema } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';
import type { UserTwoFactorEnableRequestDto } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';
import { UserTwoFactorSetupRequestSchema } from '@modules/user/dtos/request/user.two-factor-setup.request.dto';
import type { UserTwoFactorSetupRequestDto } from '@modules/user/dtos/request/user.two-factor-setup.request.dto';
import { UserProfileResponseSchema } from '@modules/user/dtos/response/user.profile.response.dto';
import { UserTwoFactorEnableResponseSchema } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import type { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import { UserTwoFactorSetupResponseSchema } from '@modules/user/dtos/response/user.two-factor-setup.response.dto';
import { UserTwoFactorStatusResponseSchema } from '@modules/user/dtos/response/user.two-factor-status.response.dto';
import type { UserTwoFactorStatusResponseDto } from '@modules/user/dtos/response/user.two-factor-status.response.dto';
import { UserMobileNumberResponseSchema } from '@modules/user/dtos/response/user.mobile-number.response.dto';
import type {
    IUser,
    IUserMobileNumber,
    IUserProfile,
    IUserTwoFactorSetup,
} from '@modules/user/interfaces/user.interface';
import { UserAuthHttpService } from '@modules/user/services/user.auth.http.service';
import { UserMobileNumberHttpService } from '@modules/user/services/user.mobile-number.http.service';
import { UserPasswordHttpService } from '@modules/user/services/user.password.http.service';
import { UserProfileHttpService } from '@modules/user/services/user.profile.http.service';
import { UserTwoFactorHttpService } from '@modules/user/services/user.two-factor.http.service';
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
    constructor(
        private readonly userAuthHttpService: UserAuthHttpService,
        private readonly userProfileHttpService: UserProfileHttpService,
        private readonly userPasswordHttpService: UserPasswordHttpService,
        private readonly userMobileNumberHttpService: UserMobileNumberHttpService,
        private readonly userTwoFactorHttpService: UserTwoFactorHttpService
    ) {}

    @Doc({ summary: 'refresh token' })
    @Response('user.refresh', { schema: AuthTokenResponseSchema })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtRefreshProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true, route: EnumRequestThrottleRoute.relaxed })
    @HttpCode(HttpStatus.OK)
    @Post('/refresh')
    async refresh(
        @UserCurrent() user: IUser,
        @AuthJwtToken() refreshToken: string
    ): Promise<IResponseReturn<IAuthToken>> {
        return this.userAuthHttpService.refresh(user, refreshToken);
    }

    @Doc({ summary: 'get profile' })
    @Response('user.profile', { schema: UserProfileResponseSchema })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/profile/get')
    async profile(
        @AuthJwtPayload('userId')
        userId: string
    ): Promise<IResponseReturn<IUserProfile>> {
        return this.userProfileHttpService.getProfile(userId);
    }

    @Doc({ summary: 'update profile' })
    @Response('user.updateProfile')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Put('/profile/update')
    async updateProfile(
        @AuthJwtPayload('userId')
        userId: string,
        @Body({ schema: UserUpdateProfileRequestSchema })
        body: UserUpdateProfileRequestDto
    ): Promise<void> {
        await this.userProfileHttpService.updateProfile(userId, body);
    }

    @Doc({ summary: 'generate upload photo profile presign' })
    @Response('user.generatePhotoProfilePresign', {
        schema: AwsS3PresignResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true, route: EnumRequestThrottleRoute.moderate })
    @HttpCode(HttpStatus.OK)
    @Post('/profile/photo/presign/generate')
    async generatePhotoProfilePresign(
        @AuthJwtPayload('userId')
        userId: string,
        @Body({ schema: UserGeneratePhotoProfileRequestSchema })
        body: UserGeneratePhotoProfileRequestDto
    ): Promise<IResponseReturn<IAwsS3Presign>> {
        return this.userProfileHttpService.generatePhotoProfilePresign(
            userId,
            body
        );
    }

    @Doc({ summary: 'update photo profile' })
    @Response('user.updatePhotoProfile')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Put('/profile/photo/update')
    async updatePhotoProfile(
        @AuthJwtPayload('userId')
        userId: string,
        @Body({ schema: UserUpdateProfilePhotoRequestSchema })
        body: UserUpdateProfilePhotoRequestDto
    ): Promise<void> {
        await this.userProfileHttpService.updatePhotoProfile(userId, body);
    }

    @Doc({ summary: 'upload photo profile' })
    @Response('user.uploadPhotoProfile')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @FileUploadSingle()
    @RequestTimeout('1m')
    @RequestThrottle({ user: true, route: EnumRequestThrottleRoute.moderate })
    @HttpCode(HttpStatus.OK)
    @Post('/profile/photo/upload')
    async uploadPhotoProfile(
        @AuthJwtPayload('userId')
        userId: string,
        @UploadedFile(
            FileRequiredPipe(),
            FileExtensionPipe([
                EnumFileExtensionImage.jpeg,
                EnumFileExtensionImage.png,
                EnumFileExtensionImage.jpg,
            ])
        )
        file: IFile
    ): Promise<void> {
        await this.userProfileHttpService.uploadPhotoProfile(userId, file);
    }

    @Doc({ summary: 'change password' })
    @Response('user.changePassword')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @FeatureFlagProtected('changePassword')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true, route: EnumRequestThrottleRoute.strict })
    @Patch('/password/change')
    async changePassword(
        @UserCurrent() user: IUser,
        @Body({ schema: UserChangePasswordRequestSchema })
        body: UserChangePasswordRequestDto
    ): Promise<void> {
        await this.userPasswordHttpService.changePassword(user, body);
    }

    @Doc({ summary: 'user add mobile number' })
    @Response('user.addMobileNumber', {
        schema: UserMobileNumberResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true, route: EnumRequestThrottleRoute.strict })
    @Post('/mobile-number/add')
    async addMobileNumber(
        @AuthJwtPayload('userId') userId: string,
        @Body({ schema: UserAddMobileNumberRequestSchema })
        body: UserAddMobileNumberRequestDto
    ): Promise<IResponseReturn<IUserMobileNumber>> {
        return this.userMobileNumberHttpService.addMobileNumber(userId, body);
    }

    @Doc({ summary: 'user update mobile number' })
    @Response('user.updateMobileNumber', {
        schema: UserMobileNumberResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Put('/mobile-number/:mobileNumberId/update')
    async updateMobileNumber(
        @AuthJwtPayload('userId') userId: string,
        @Param('mobileNumberId', { schema: RequestUuidSchema })
        mobileNumberId: string,
        @Body({ schema: UserUpdateMobileNumberRequestSchema })
        body: UserUpdateMobileNumberRequestDto
    ): Promise<IResponseReturn<IUserMobileNumber>> {
        return this.userMobileNumberHttpService.updateMobileNumber(
            userId,
            mobileNumberId,
            body
        );
    }

    @Doc({ summary: 'user delete mobile number' })
    @Response('user.deleteMobileNumber', {
        schema: UserMobileNumberResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Delete('/mobile-number/:mobileNumberId/delete')
    async deleteMobileNumber(
        @AuthJwtPayload('userId') userId: string,
        @Param('mobileNumberId', { schema: RequestUuidSchema })
        mobileNumberId: string
    ): Promise<IResponseReturn<IUserMobileNumber>> {
        return this.userMobileNumberHttpService.deleteMobileNumber(
            userId,
            mobileNumberId
        );
    }

    @Doc({ summary: 'user claim username' })
    @Response('user.claimUsername')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true, route: EnumRequestThrottleRoute.moderate })
    @HttpCode(HttpStatus.OK)
    @Post('/username/claim')
    async claimUsername(
        @AuthJwtPayload('userId') userId: string,
        @Body({ schema: UserClaimUsernameRequestSchema })
        body: UserClaimUsernameRequestDto
    ): Promise<void> {
        await this.userProfileHttpService.claimUsername(userId, body);
    }

    @Doc({ summary: 'Get current two-factor authentication status' })
    @Response('user.twoFactor.status', {
        schema: UserTwoFactorStatusResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/2fa/status/get')
    async getTwoFactorStatus(
        @UserCurrent() user: IUser
    ): Promise<IResponseReturn<UserTwoFactorStatusResponseDto>> {
        return this.userTwoFactorHttpService.getTwoFactorStatus(user);
    }

    @Doc({
        summary:
            'Start two-factor setup and receive secret; requires an unused backup code while two-factor is enabled',
    })
    @Response('user.twoFactor.setup', {
        schema: UserTwoFactorSetupResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true, route: EnumRequestThrottleRoute.strict })
    @HttpCode(HttpStatus.OK)
    @Post('/2fa/setup')
    async setupTwoFactor(
        @UserCurrent() user: IUser,
        @Body({ schema: UserTwoFactorSetupRequestSchema })
        body: UserTwoFactorSetupRequestDto
    ): Promise<IResponseReturn<IUserTwoFactorSetup>> {
        return this.userTwoFactorHttpService.setupTwoFactor(user, body);
    }

    @Doc({ summary: 'Enable two-factor authentication' })
    @Response('user.twoFactor.enable', {
        schema: UserTwoFactorEnableResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true, route: EnumRequestThrottleRoute.strict })
    @HttpCode(HttpStatus.OK)
    @Post('/2fa/enable')
    async enableTwoFactor(
        @UserCurrent() user: IUser,
        @Body({ schema: UserTwoFactorEnableRequestSchema })
        body: UserTwoFactorEnableRequestDto
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        return this.userTwoFactorHttpService.enableTwoFactor(user, body);
    }

    @Doc({ summary: 'Disable two-factor authentication' })
    @Response('user.twoFactor.disable')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true, route: EnumRequestThrottleRoute.strict })
    @Delete('/2fa/disable')
    async disableTwoFactor(
        @UserCurrent() user: IUser,
        @Body({ schema: UserTwoFactorDisableRequestSchema })
        body: UserTwoFactorDisableRequestDto
    ): Promise<void> {
        await this.userTwoFactorHttpService.disableTwoFactor(user, body);
    }

    @Doc({ summary: 'Regenerate two-factor backup codes' })
    @Response('user.twoFactor.regenerateBackupCodes', {
        schema: UserTwoFactorEnableResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true, route: EnumRequestThrottleRoute.strict })
    @Post('/2fa/backup-code/regenerate')
    async regenerateTwoFactorBackupCodes(
        @UserCurrent() user: IUser,
        @Body({ schema: UserTwoFactorRegenerateBackupCodeRequestSchema })
        body: UserTwoFactorRegenerateBackupCodeRequestDto
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        return this.userTwoFactorHttpService.regenerateTwoFactorBackupCodes(
            user,
            body
        );
    }

    @Doc({
        summary:
            'Logout from current session, invalidating the access token and deleting the session.',
    })
    @Response('user.logout')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @HttpCode(HttpStatus.OK)
    @Post('/logout')
    async logout(
        @AuthJwtPayload()
        { sessionId, userId, deviceOwnershipId }: IAuthJwtAccessTokenPayload
    ): Promise<void> {
        await this.userAuthHttpService.logout(
            userId,
            sessionId,
            deviceOwnershipId
        );
    }

    // TODO: Verify number implementation, but which provider?
}
