import {
    AwsS3PresignResponseDto,
    AwsS3PresignResponseSchema,
} from '@common/aws/dtos/response/aws.s3-presign.response.dto';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocRequestFile,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { FileUploadSingleRequestSchema } from '@common/file/dtos/file.single.dto';
import {
    AuthTokenResponseDto,
    AuthTokenResponseSchema,
} from '@modules/auth/dtos/response/auth.token.response.dto';
import { UserDocParamsMobileNumberId } from '@modules/user/constants/user.doc.constant';
import {
    UserProfileResponseDto,
    UserProfileResponseSchema,
} from '@modules/user/dtos/response/user.profile.response.dto';
import {
    UserTwoFactorEnableResponseDto,
    UserTwoFactorEnableResponseSchema,
} from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import {
    UserTwoFactorSetupResponseDto,
    UserTwoFactorSetupResponseSchema,
} from '@modules/user/dtos/response/user.two-factor-setup.response.dto';
import {
    UserTwoFactorStatusResponseDto,
    UserTwoFactorStatusResponseSchema,
} from '@modules/user/dtos/response/user.two-factor-status.response.dto';
import {
    UserMobileNumberResponseDto,
    UserMobileNumberResponseSchema,
} from '@modules/user/dtos/response/user.mobile-number.response.dto';
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
            schema: AuthTokenResponseSchema,
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
        DocGuard({
            termPolicy: true,
        }),
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
        DocGuard({
            termPolicy: true,
        }),
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
        DocGuard({
            termPolicy: true,
        }),
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
        DocGuard({
            termPolicy: true,
        }),
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
            params: UserDocParamsMobileNumberId,
        }),
        DocGuard({
            termPolicy: true,
        }),
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
        DocResponse<UserTwoFactorSetupResponseDto>('user.twoFactor.setup', {
            schema: UserTwoFactorSetupResponseSchema,
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
        DocResponse<UserTwoFactorStatusResponseDto>('user.twoFactor.status', {
            schema: UserTwoFactorStatusResponseSchema,
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
        DocGuard({
            termPolicy: true,
        }),
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
        DocGuard({
            termPolicy: true,
        }),
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
        DocGuard({
            termPolicy: true,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('user.logout')
    );
}
