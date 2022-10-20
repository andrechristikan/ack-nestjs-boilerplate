import { applyDecorators } from '@nestjs/common';
import { AuthInfoSerialization } from 'src/common/auth/serializations/auth.info.serialization';
import { Doc } from 'src/common/doc/decorators/doc.decorator';

export function AuthGetInfoDoc(): any {
    return applyDecorators(
        Doc<AuthInfoSerialization>('auth.info', {
            auth: {
                jwtAccessToken: true,
                apiKey: true,
            },
            requestHeader: {
                userAgent: true,
                timestamp: true,
            },
            response: {
                classSerialization: AuthInfoSerialization,
            },
        })
    );
}
