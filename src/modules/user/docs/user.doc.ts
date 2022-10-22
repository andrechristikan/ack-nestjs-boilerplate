import { applyDecorators } from '@nestjs/common';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/constants/doc.constant';
import { Doc } from 'src/common/doc/decorators/doc.decorator';
import { UserLoginSerialization } from 'src/modules/user/serializations/user.login.serialization';
import { UserProfileSerialization } from 'src/modules/user/serializations/user.profile.serialization';

export function UserProfileDoc(): any {
    return applyDecorators(
        Doc<UserProfileSerialization>('user.profile', {
            auth: {
                jwtAccessToken: true,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            response: {
                classSerialization: UserProfileSerialization,
            },
        })
    );
}

export function UserChangePasswordDoc(): any {
    return applyDecorators(
        Doc<void>('user.changePassword', {
            auth: {
                jwtAccessToken: true,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
        })
    );
}

export function UserUploadProfileDoc(): any {
    return applyDecorators(
        Doc<void>('user.upload', {
            auth: {
                jwtAccessToken: true,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            request: {
                bodyType: ENUM_DOC_REQUEST_BODY_TYPE.FORM_DATA,
                file: {
                    multiple: false,
                },
            },
        })
    );
}

export function UserLoginDoc(): any {
    return applyDecorators(
        Doc<UserLoginSerialization>('user.login', {
            auth: {
                jwtAccessToken: true,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            response: {
                classSerialization: UserLoginSerialization,
            },
        })
    );
}

export function UserRefreshDoc(): any {
    return applyDecorators(
        Doc<UserLoginSerialization>('user.refresh', {
            auth: {
                jwtAccessToken: true,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            response: {
                classSerialization: UserLoginSerialization,
            },
        })
    );
}
