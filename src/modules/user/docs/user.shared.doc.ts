import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequestFile,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { FileSingleDto } from 'src/common/file/dtos/file.single.dto';
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
