import { applyDecorators } from '@nestjs/common';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/constants/doc.enum.constant';
import { Doc } from 'src/common/doc/decorators/doc.decorator';
import { UserLoginSerialization } from 'src/modules/user/serializations/user.login.serialization';
import { UserPayloadSerialization } from 'src/modules/user/serializations/user.payload.serialization';
import { UserProfileSerialization } from 'src/modules/user/serializations/user.profile.serialization';

export function UserAuthRefreshDoc(): MethodDecorator {
    return applyDecorators(
        Doc<UserLoginSerialization>('user.refresh', {
            auth: {
                jwtRefreshToken: true,
            },
            response: {
                serialization: UserLoginSerialization,
            },
        })
    );
}

export function UserAuthProfileDoc(): MethodDecorator {
    return applyDecorators(
        Doc<UserProfileSerialization>('user.profile', {
            auth: {
                jwtAccessToken: true,
            },
            response: {
                serialization: UserProfileSerialization,
            },
        })
    );
}

export function UserAuthUploadProfileDoc(): MethodDecorator {
    return applyDecorators(
        Doc<void>('user.upload', {
            auth: {
                jwtAccessToken: true,
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

export function UserAuthInfoDoc(): MethodDecorator {
    return applyDecorators(
        Doc<UserPayloadSerialization>('user.info', {
            auth: {
                jwtAccessToken: true,
            },
            response: {
                serialization: UserPayloadSerialization,
            },
        })
    );
}

export function UserAuthChangePasswordDoc(): MethodDecorator {
    return applyDecorators(
        Doc<void>('user.changePassword', {
            auth: {
                jwtAccessToken: true,
            },
        })
    );
}
