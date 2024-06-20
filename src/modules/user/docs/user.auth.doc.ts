import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/constants/doc.enum.constant';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocRequestFile,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { FileSingleDto } from 'src/common/file/dtos/file.single.dto';
import { UserChangePasswordRequestDto } from 'src/modules/user/dtos/request/user.change-password.request.dto';
import { UserLoginRequestDto } from 'src/modules/user/dtos/request/user.login.request.dto';
import { UserUpdateRequestDto } from 'src/modules/user/dtos/request/user.update.request.dto';
import { UserLoginResponseDto } from 'src/modules/user/dtos/response/user.login.response.dto';
import { UserProfileResponseDto } from 'src/modules/user/dtos/response/user.profile.response.dto';
import { UserRefreshResponseDto } from 'src/modules/user/dtos/response/user.refresh.response.dto';

export function UserAuthLoginCredentialDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'login with email and password',
        }),
        DocAuth({ xApiKey: true }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: UserLoginRequestDto,
        }),
        DocResponse<UserLoginResponseDto>('user.loginWithCredential', {
            dto: UserLoginResponseDto,
        })
    );
}

export function UserAuthLoginSocialGoogleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'login with social google',
        }),
        DocAuth({ xApiKey: true, google: true }),
        DocResponse<UserLoginResponseDto>('user.loginWithSocialGoogle', {
            dto: UserLoginResponseDto,
        })
    );
}

export function UserAuthLoginSocialAppleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'login with social apple',
        }),
        DocAuth({ xApiKey: true, apple: true }),
        DocResponse<UserLoginResponseDto>('user.loginWithSocialApple', {
            dto: UserLoginResponseDto,
        })
    );
}

export function UserAuthRefreshDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'refresh a token',
        }),
        DocAuth({
            xApiKey: true,
            jwtRefreshToken: true,
        }),
        DocResponse<UserRefreshResponseDto>('user.refresh', {
            dto: UserRefreshResponseDto,
        })
    );
}

export function UserAuthChangePasswordDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'change password',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: UserChangePasswordRequestDto,
        }),
        DocResponse('user.changePassword')
    );
}

export function UserAuthProfileDoc(): MethodDecorator {
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

export function UserAuthUploadProfileDoc(): MethodDecorator {
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

export function UserAuthUpdateProfileDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update profile',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: UserUpdateRequestDto,
        }),
        DocResponse('user.updateProfile')
    );
}
