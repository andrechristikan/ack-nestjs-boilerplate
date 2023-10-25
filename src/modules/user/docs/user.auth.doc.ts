import { applyDecorators } from '@nestjs/common';
import { AuthAccessPayloadSerialization } from 'src/common/auth/serializations/auth.access-payload.serialization';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/constants/doc.enum.constant';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocRequestFile,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { FileSingleDto } from 'src/common/file/dtos/file.single.dto';
import { UserChangePasswordDto } from 'src/modules/user/dtos/user.change-password.dto';
import { UserLoginDto } from 'src/modules/user/dtos/user.login.dto';
import { UserUpdateNameDto } from 'src/modules/user/dtos/user.update-name.dto';
import { UserUpdateUsernameDto } from 'src/modules/user/dtos/user.update-username.dto';
import { UserLoginSerialization } from 'src/modules/user/serializations/user.login.serialization';
import { UserProfileSerialization } from 'src/modules/user/serializations/user.profile.serialization';
import { UserRefreshSerialization } from 'src/modules/user/serializations/user.refresh.serialization';

export function UserAuthLoginDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'login with email and password',
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            body: UserLoginDto,
        }),
        DocAuth({ apiKey: true }),
        DocResponse<UserLoginSerialization>('user.login', {
            serialization: UserLoginSerialization,
        })
    );
}

export function UserAuthLoginGoogleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'login with access token google',
        }),
        DocAuth({ google: true, apiKey: true }),
        DocResponse('user.loginGoogle')
    );
}

export function UserAuthRefreshDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'refresh a token',
        }),
        DocAuth({ apiKey: true, jwtRefreshToken: true }),
        DocResponse<UserRefreshSerialization>('user.refresh', {
            serialization: UserRefreshSerialization,
        })
    );
}

export function UserAuthProfileDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get profile',
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse<UserProfileSerialization>('user.profile', {
            serialization: UserProfileSerialization,
        })
    );
}

export function UserAuthUploadProfileDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update profile photo',
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocRequestFile({
            body: FileSingleDto,
        }),
        DocResponse('user.upload')
    );
}

export function UserAuthUpdateProfileDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update profile',
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            body: UserUpdateNameDto,
        }),
        DocResponse('user.updateProfile')
    );
}

export function UserAuthInfoDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get info of access token',
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse<AuthAccessPayloadSerialization>('user.info', {
            serialization: AuthAccessPayloadSerialization,
        })
    );
}

export function UserAuthChangePasswordDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'change password',
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            body: UserChangePasswordDto,
        }),
        DocResponse('user.changePassword')
    );
}

export function UserAuthClaimUsernameDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'claim username',
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            body: UserUpdateUsernameDto,
        }),
        DocResponse('user.claimUsername')
    );
}
