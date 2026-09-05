import { AwsS3PresignResponseSchema } from '@common/aws/dtos/response/aws.s3-presign.response.dto';
import { IAwsS3Presign } from '@common/aws/interfaces/aws.interface';
import { FileUploadSingle } from '@common/file/decorators/file.decorator';
import { EnumFileExtensionImage } from '@common/file/enums/file.enum';
import { IFile } from '@common/file/interfaces/file.interface';
import { FileExtensionPipe } from '@common/file/pipes/file.extension.pipe';
import { RequestTimeout } from '@common/request/decorators/request.decorator';
import { RequestThrottle } from '@common/request/decorators/request.throttler.decorator';
import { EnumRequestThrottleRoute } from '@common/request/enums/request.enum';
import { RequestIsValidUuidPipe } from '@common/request/pipes/request.is-valid-uuid.pipe';
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
import { AuthTokenResponseSchema } from '@modules/auth/dtos/response/auth.token.response.dto';
import {
    IAuthJwtAccessTokenPayload,
    IAuthToken,
} from '@modules/auth/interfaces/auth.interface';
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
import {
    UserChangePasswordRequestDto,
    UserChangePasswordRequestSchema,
} from '@modules/user/dtos/request/user.change-password.request.dto';
import {
    UserClaimUsernameRequestDto,
    UserClaimUsernameRequestSchema,
} from '@modules/user/dtos/request/user.claim-username.request.dto';
import {
    UserGeneratePhotoProfileRequestDto,
    UserGeneratePhotoProfileRequestSchema,
} from '@modules/user/dtos/request/user.generate-photo-profile.request.dto';
import {
    UserAddMobileNumberRequestDto,
    UserAddMobileNumberRequestSchema,
    UserUpdateMobileNumberRequestDto,
    UserUpdateMobileNumberRequestSchema,
} from '@modules/user/dtos/request/user.mobile-number.request.dto';
import {
    UserUpdateProfilePhotoRequestDto,
    UserUpdateProfilePhotoRequestSchema,
    UserUpdateProfileRequestDto,
    UserUpdateProfileRequestSchema,
} from '@modules/user/dtos/request/user.profile.request.dto';
import {
    UserTwoFactorDisableRequestDto,
    UserTwoFactorDisableRequestSchema,
} from '@modules/user/dtos/request/user.two-factor-disable.request.dto';
import {
    UserTwoFactorRegenerateBackupCodeRequestDto,
    UserTwoFactorRegenerateBackupCodeRequestSchema,
} from '@modules/user/dtos/request/user.two-factor-regenerate-backup-code.request.dto';
import {
    UserTwoFactorEnableRequestDto,
    UserTwoFactorEnableRequestSchema,
} from '@modules/user/dtos/request/user.two-factor-enable.request.dto';
import { UserProfileResponseSchema } from '@modules/user/dtos/response/user.profile.response.dto';
import {
    UserTwoFactorEnableResponseDto,
    UserTwoFactorEnableResponseSchema,
} from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import { UserTwoFactorSetupResponseSchema } from '@modules/user/dtos/response/user.two-factor-setup.response.dto';
import {
    UserTwoFactorStatusResponseDto,
    UserTwoFactorStatusResponseSchema,
} from '@modules/user/dtos/response/user.two-factor-status.response.dto';
import { UserMobileNumberResponseSchema } from '@modules/user/dtos/response/user.mobile-number.response.dto';
import {
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

    @UserSharedRefreshDoc()
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

    @UserSharedProfileDoc()
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

    @UserSharedUpdateProfileDoc()
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

    @UserSharedGeneratePhotoProfilePresignDoc()
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

    @UserSharedUpdatePhotoProfileDoc()
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

    @UserSharedUploadPhotoProfileDoc()
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
            RequestRequiredPipe,
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

    @UserSharedChangePasswordDoc()
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

    @UserSharedAddMobileNumberDoc()
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

    @UserSharedUpdateMobileNumberDoc()
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
        @Param(
            'mobileNumberId',
            RequestRequiredPipe,
            RequestIsValidUuidPipe
        )
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

    @UserSharedDeleteMobileNumberDoc()
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
        @Param(
            'mobileNumberId',
            RequestRequiredPipe,
            RequestIsValidUuidPipe
        )
        mobileNumberId: string
    ): Promise<IResponseReturn<IUserMobileNumber>> {
        return this.userMobileNumberHttpService.deleteMobileNumber(
            userId,
            mobileNumberId
        );
    }

    @UserSharedClaimUsernameDoc()
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

    @UserSharedTwoFactorStatusDoc()
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

    @UserSharedTwoFactorSetupDoc()
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
        @UserCurrent() user: IUser
    ): Promise<IResponseReturn<IUserTwoFactorSetup>> {
        return this.userTwoFactorHttpService.setupTwoFactor(user);
    }

    @UserSharedTwoFactorEnableDoc()
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

    @UserSharedTwoFactorDisableDoc()
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

    @UserSharedTwoFactorRegenerateBackupDoc()
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

    @UserSharedLogoutDoc()
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
