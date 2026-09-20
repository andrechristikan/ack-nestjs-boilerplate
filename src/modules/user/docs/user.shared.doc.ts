import { AwsS3PresignResponseSchema } from '@common/aws/dtos/response/aws.s3-presign.response.dto';
import type { AwsS3PresignResponseDto } from '@common/aws/dtos/response/aws.s3-presign.response.dto';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocRequestFile,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { FileUploadSingleRequestSchema } from '@common/file/dtos/request/file.upload-single.request.dto';
import { AuthTokenResponseSchema } from '@modules/auth/dtos/response/auth.token.response.dto';
import type { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import { UserProfileResponseSchema } from '@modules/user/dtos/response/user.profile.response.dto';
import type { UserProfileResponseDto } from '@modules/user/dtos/response/user.profile.response.dto';
import { UserTwoFactorEnableResponseSchema } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import type { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import { UserTwoFactorSetupResponseSchema } from '@modules/user/dtos/response/user.two-factor-setup.response.dto';
import type { UserTwoFactorSetupResponseDto } from '@modules/user/dtos/response/user.two-factor-setup.response.dto';
import { UserTwoFactorStatusResponseSchema } from '@modules/user/dtos/response/user.two-factor-status.response.dto';
import type { UserTwoFactorStatusResponseDto } from '@modules/user/dtos/response/user.two-factor-status.response.dto';
import { UserMobileNumberResponseSchema } from '@modules/user/dtos/response/user.mobile-number.response.dto';
import type { UserMobileNumberResponseDto } from '@modules/user/dtos/response/user.mobile-number.response.dto';
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
        DocGuard({ termPolicy: true, user: true }),
        DocResponse<AuthTokenResponseDto>('user.response', {
            schema: AuthTokenResponseSchema,
        })
    );
}

export function UserSharedProfileDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get profile',
        }),
        DocGuard({ termPolicy: true, user: true }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse<UserProfileResponseDto>('user.profile', {
            schema: UserProfileResponseSchema,
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
        }),
        DocGuard({ termPolicy: true, user: true }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('user.updateProfile')
    );
}

export function UserSharedGeneratePhotoProfilePresignDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'generate upload photo profile presign',
        }),
        DocGuard({ termPolicy: true, user: true }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocResponse<AwsS3PresignResponseDto>(
            'user.generatePhotoProfilePresign',
            {
                schema: AwsS3PresignResponseSchema,
            }
        )
    );
}

export function UserSharedUpdatePhotoProfileDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update photo profile',
        }),
        DocGuard({ termPolicy: true, user: true }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocResponse('user.updatePhotoProfile')
    );
}

export function UserSharedUploadPhotoProfileDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'upload photo profile',
        }),
        DocGuard({ termPolicy: true, user: true }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequestFile({
            schema: FileUploadSingleRequestSchema,
        }),
        DocResponse('user.uploadPhotoProfile')
    );
}

export function UserSharedChangePasswordDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'change password',
        }),
        DocGuard({ termPolicy: true, user: true, featureFlag: true }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
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
        }),
        DocGuard({ termPolicy: true, user: true }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse<UserMobileNumberResponseDto>('user.addMobileNumber', {
            httpStatus: HttpStatus.CREATED,
            schema: UserMobileNumberResponseSchema,
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
        }),
        DocGuard({ termPolicy: true, user: true }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse<UserMobileNumberResponseDto>('user.updateMobileNumber', {
            schema: UserMobileNumberResponseSchema,
        })
    );
}

export function UserSharedDeleteMobileNumberDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'user delete mobile number',
        }),
        DocGuard({ termPolicy: true, user: true }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse<UserMobileNumberResponseDto>('user.deleteMobileNumber', {
            schema: UserMobileNumberResponseSchema,
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
        }),
        DocGuard({ termPolicy: true, user: true }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('user.claimUsername')
    );
}

export function UserSharedTwoFactorStatusDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Get current two-factor authentication status',
        }),
        DocGuard({ termPolicy: true, user: true }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse<UserTwoFactorStatusResponseDto>('user.twoFactor.status', {
            schema: UserTwoFactorStatusResponseSchema,
        })
    );
}

export function UserSharedTwoFactorSetupDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'Start two-factor setup and receive secret; requires an unused backup code while two-factor is enabled',
        }),
        DocGuard({ termPolicy: true, user: true }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocResponse<UserTwoFactorSetupResponseDto>('user.twoFactor.setup', {
            schema: UserTwoFactorSetupResponseSchema,
        })
    );
}

export function UserSharedTwoFactorEnableDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Enable two-factor authentication',
        }),
        DocGuard({ termPolicy: true, user: true }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocResponse<UserTwoFactorEnableResponseDto>('user.twoFactor.enable', {
            schema: UserTwoFactorEnableResponseSchema,
        })
    );
}

export function UserSharedTwoFactorDisableDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Disable two-factor authentication',
        }),
        DocGuard({ termPolicy: true, user: true }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocResponse('user.twoFactor.disable')
    );
}

export function UserSharedTwoFactorRegenerateBackupDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Regenerate two-factor backup codes',
        }),
        DocGuard({ termPolicy: true, user: true }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocResponse<UserTwoFactorEnableResponseDto>(
            'user.twoFactor.regenerateBackupCodes',
            {
                schema: UserTwoFactorEnableResponseSchema,
            }
        )
    );
}

export function UserSharedLogoutDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'Logout from current session, invalidating the access token and deleting the session.',
        }),
        DocGuard({ termPolicy: true, user: true }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('user.logout')
    );
}
