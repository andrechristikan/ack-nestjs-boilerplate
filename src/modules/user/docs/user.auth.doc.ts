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
import { UserLoginSerialization } from 'src/modules/user/serializations/user.login.serialization';
import { UserProfileSerialization } from 'src/modules/user/serializations/user.profile.serialization';
import { UserRefreshSerialization } from 'src/modules/user/serializations/user.refresh.serialization';

export function UserAuthLoginDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            operation: 'modules.public.user',
        }),
        DocRequest({ bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON }),
        DocResponse<UserLoginSerialization>('user.login', {
            serialization: UserLoginSerialization,
        })
    );
}

export function UserAuthLoginGoogleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            operation: 'modules.auth.user',
        }),
        DocAuth({ apiKey: true, jwtRefreshToken: true }),
        DocResponse('user.loginGoogle')
    );
}

export function UserAuthRefreshDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            operation: 'modules.auth.user',
        }),
        DocAuth({
            jwtRefreshToken: true,
        }),
        DocResponse<UserRefreshSerialization>('user.refresh', {
            serialization: UserRefreshSerialization,
        })
    );
}

export function UserAuthProfileDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            operation: 'modules.auth.user',
        }),
        DocAuth({
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
            operation: 'modules.auth.user',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocRequestFile(),
        DocResponse('user.upload')
    );
}

export function UserAuthUpdateProfileDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            operation: 'modules.auth.user',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocRequest({ bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON }),
        DocResponse('user.updateProfile')
    );
}

export function UserAuthInfoDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            operation: 'modules.auth.user',
        }),
        DocAuth({
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
            operation: 'modules.auth.user',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocRequest({ bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON }),
        DocResponse('user.changePassword')
    );
}

export function UserAuthClaimUsernameDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            operation: 'modules.auth.user',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocRequest({ bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON }),
        DocResponse('user.claimUsername')
    );
}
