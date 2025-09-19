import { AwsS3PresignDto } from '@common/aws/dtos/aws.s3-presign.dto';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@common/doc/enums/doc.enum';
import { UserGeneratePhotoProfileRequestDto } from '@modules/user/dtos/request/user.generate-photo-profile.request.dto';
import {
    UserUpdatePhotoProfileResponseDto,
    UserUpdateProfileRequestDto,
} from '@modules/user/dtos/request/user.update-profile.request.dto';
import { UserProfileResponseDto } from '@modules/user/dtos/response/user.profile.response.dto';
import { applyDecorators } from '@nestjs/common';

export function UserSharedProfileDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get profile',
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
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: UserUpdateProfileRequestDto,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('user.updateProfile')
    );
}

export function UserSharedGeneratePhotoProfileDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'generate upload photo profile presign',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: UserGeneratePhotoProfileRequestDto,
        }),
        DocResponse<AwsS3PresignDto>('user.generatePhotoProfile', {
            dto: AwsS3PresignDto,
        })
    );
}

export function UserSharedUpdatePhotoProfileDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update photo profile',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: UserUpdatePhotoProfileResponseDto,
        }),
        DocResponse('user.updatePhotoProfile')
    );
}
