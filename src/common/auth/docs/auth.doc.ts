import { applyDecorators } from '@nestjs/common';
import { AuthLoginSerialization } from 'src/common/auth/serializations/auth.login.serialization';
import { AuthPayloadSerialization } from 'src/common/auth/serializations/auth.payload.serialization';
import { Doc } from 'src/common/doc/decorators/doc.decorator';

export function AuthLoginDoc(): MethodDecorator {
    return applyDecorators(
        Doc<AuthLoginSerialization>('user.login', {
            auth: {
                jwtAccessToken: true,
            },
            response: {
                serialization: AuthLoginSerialization,
            },
        })
    );
}

export function AuthRefreshDoc(): MethodDecorator {
    return applyDecorators(
        Doc<AuthLoginSerialization>('user.refresh', {
            auth: {
                jwtRefreshToken: true,
            },
            response: {
                serialization: AuthLoginSerialization,
            },
        })
    );
}

export function AuthInfoDoc(): MethodDecorator {
    return applyDecorators(
        Doc<AuthPayloadSerialization>('user.info', {
            auth: {
                jwtAccessToken: true,
            },
            response: {
                serialization: AuthPayloadSerialization,
            },
        })
    );
}

export function AuthChangePasswordDoc(): MethodDecorator {
    return applyDecorators(
        Doc<void>('user.changePassword', {
            auth: {
                jwtAccessToken: true,
            },
        })
    );
}
