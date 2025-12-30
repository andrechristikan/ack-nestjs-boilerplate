import { AwsS3PresignDto } from '@common/aws/dtos/aws.s3-presign.dto';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocRequestFile,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { FileSingleDto } from '@common/file/dtos/file.single.dto';
import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import { UserDocParamsMobileNumberId } from '@modules/user/constants/user.doc.constant';
import { UserChangePasswordRequestDto } from '@modules/user/dtos/request/user.change-password.request.dto';
import { UserClaimUsernameRequestDto } from '@modules/user/dtos/request/user.claim-username.request.dto';
import { UserGeneratePhotoProfileRequestDto } from '@modules/user/dtos/request/user.generate-photo-profile.request.dto';
import {
    UserAddMobileNumberRequestDto,
    UserUpdateMobileNumberRequestDto,
} from '@modules/user/dtos/request/user.mobile-number.request.dto';
import { UserUpdateNotificationSettingRequestDto } from '@modules/user/dtos/request/user.notification-setting.request.dto';
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
import { HttpStatus, applyDecorators } from '@nestjs/common';

export function UserSharedRefreshDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'refresh token',
        }),
        DocAuth({
            xApiKey: true,
            jwtRefreshToken: true,
        }),
        DocGuard({
            termPolicy: true,
        }),
        DocResponse<AuthTokenResponseDto>('user.response', {
            dto: AuthTokenResponseDto,
        })
    );
}

export function UserSharedProfileDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get profile',
        }),
        DocGuard({
            termPolicy: true,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse<UserProfileResponseDto>('user.profile', {
            dto: UserProfileResponseDto,
        })
    );
}

export function UserSharedUpdateProfileDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update profile',
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserUpdateProfileRequestDto,
        }),
        DocGuard({
            termPolicy: true,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('user.updateProfile')
    );
}

export function UserSharedUpdateNotificationSettingDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update notification setting',
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserUpdateNotificationSettingRequestDto,
        }),
        DocGuard({
            termPolicy: true,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('user.updateNotificationSetting')
    );
}

export function UserSharedGeneratePhotoProfilePresignDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'generate upload photo profile presign',
        }),
        DocGuard({
            termPolicy: true,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserGeneratePhotoProfileRequestDto,
        }),
        DocResponse<AwsS3PresignDto>('user.generatePhotoProfilePresign', {
            dto: AwsS3PresignDto,
        })
    );
}

export function UserSharedUpdatePhotoProfileDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update photo profile',
        }),
        DocGuard({
            termPolicy: true,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserUpdateProfilePhotoRequestDto,
        }),
        DocResponse('user.updatePhotoProfile')
    );
}

export function UserSharedUploadPhotoProfileDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'upload photo profile',
        }),
        DocGuard({
            termPolicy: true,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequestFile({
            dto: FileSingleDto,
        }),
        DocResponse('user.uploadPhotoProfile')
    );
}

export function UserSharedChangePasswordDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'change password',
        }),
        DocGuard({
            termPolicy: true,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserChangePasswordRequestDto,
        }),
        DocResponse('user.changePassword')
    );
}

export function UserSharedAddMobileNumberDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'user add mobile number',
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserAddMobileNumberRequestDto,
        }),
        DocGuard({
            termPolicy: true,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('user.addMobileNumber', {
            httpStatus: HttpStatus.CREATED,
            dto: UserMobileNumberResponseDto,
        })
    );
}

export function UserSharedUpdateMobileNumberDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'user update mobile number',
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserUpdateMobileNumberRequestDto,
            params: UserDocParamsMobileNumberId,
        }),
        DocGuard({
            termPolicy: true,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('user.updateMobileNumber', {
            dto: UserMobileNumberResponseDto,
        })
    );
}

export function UserSharedDeleteMobileNumberDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'user delete mobile number',
        }),
        DocRequest({
            params: UserDocParamsMobileNumberId,
        }),
        DocGuard({
            termPolicy: true,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('user.deleteMobileNumber', {
            dto: UserMobileNumberResponseDto,
        })
    );
}

export function UserSharedClaimUsernameDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'user claim username',
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserClaimUsernameRequestDto,
        }),
        DocGuard({
            termPolicy: true,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('user.claimUsername')
    );
}

export function UserSharedTwoFactorSetupDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Start two-factor setup and receive secret',
        }),
        DocGuard({
            termPolicy: true,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('user.twoFactor.setup', {
            dto: UserTwoFactorSetupResponseDto,
        })
    );
}

export function UserSharedTwoFactorStatusDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Get current two-factor authentication status',
        }),
        DocGuard({
            termPolicy: true,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('user.twoFactor.status', {
            dto: UserTwoFactorStatusResponseDto,
        })
    );
}

export function UserSharedTwoFactorEnableDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Enable two-factor authentication',
        }),
        DocGuard({
            termPolicy: true,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserTwoFactorEnableRequestDto,
        }),
        DocResponse('user.twoFactor.enable', {
            dto: UserTwoFactorEnableResponseDto,
        })
    );
}

export function UserSharedTwoFactorDisableDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Disable two-factor authentication',
        }),
        DocGuard({
            termPolicy: true,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserTwoFactorDisableRequestDto,
        }),
        DocResponse('user.twoFactor.disable')
    );
}

export function UserSharedTwoFactorRegenerateBackupDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Regenerate two-factor backup codes',
        }),
        DocGuard({
            termPolicy: true,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('user.twoFactor.regenerate', {
            dto: UserTwoFactorEnableResponseDto,
        })
    );
}
