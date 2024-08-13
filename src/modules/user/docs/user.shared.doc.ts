import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocRequestFile,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import { FileSingleDto } from 'src/common/file/dtos/file.single.dto';
import { UserUpdateProfileRequestDto } from 'src/modules/user/dtos/request/user.update-profile.dto';
import { UserProfileResponseDto } from 'src/modules/user/dtos/response/user.profile.response.dto';

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

export function UserSharedUploadProfileDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update profile photo',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequestFile({
            dto: FileSingleDto,
        }),
        DocResponse('user.upload', {
            httpStatus: HttpStatus.CREATED,
        })
    );
}
