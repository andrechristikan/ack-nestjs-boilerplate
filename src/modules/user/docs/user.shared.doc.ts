import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@common/doc/enums/doc.enum';
import { AwsS3PresignRequestDto } from '@modules/aws/dtos/request/aws.s3-presign.request.dto';
import { AwsS3PresignResponseDto } from '@modules/aws/dtos/response/aws.s3-presign.response.dto';
import { UserUpdateProfileRequestDto } from '@modules/user/dtos/request/user.update-profile.request.dto';
import { UserProfileResponseDto } from '@modules/user/dtos/response/user.profile.response.dto';
import { UserUploadPhotoProfileRequestDto } from '@modules/user/dtos/request/user.upload-photo-profile.request.dto';

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

export function UserSharedUploadPhotoProfileDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get presign url for photo profile',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: UserUploadPhotoProfileRequestDto,
        }),
        DocResponse<AwsS3PresignResponseDto>('user.uploadPhotoProfile', {
            dto: AwsS3PresignResponseDto,
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
            dto: AwsS3PresignRequestDto,
        }),
        DocResponse('user.updatePhotoProfile')
    );
}
