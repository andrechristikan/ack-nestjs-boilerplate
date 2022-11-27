import { applyDecorators } from '@nestjs/common';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/constants/doc.enum.constant';
import { Doc } from 'src/common/doc/decorators/doc.decorator';
import { UserProfileSerialization } from 'src/modules/user/serializations/user.profile.serialization';

export function UserProfileDoc(): MethodDecorator {
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

export function UserUploadProfileDoc(): MethodDecorator {
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
