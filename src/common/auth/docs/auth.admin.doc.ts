import { applyDecorators } from '@nestjs/common';
import { Doc } from 'src/common/doc/decorators/doc.decorator';
import { UserDocParamsGet } from 'src/modules/user/constants/user.doc.constant';

export function AuthActiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc<void>('auth.active', {
            auth: {
                jwtAccessToken: true,
            },
            request: {
                params: UserDocParamsGet,
            },
        })
    );
}

export function AuthInactiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc<void>('auth.inactive', {
            auth: {
                jwtAccessToken: true,
            },
            request: {
                params: UserDocParamsGet,
            },
        })
    );
}
