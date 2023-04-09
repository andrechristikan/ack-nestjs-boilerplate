import { applyDecorators } from '@nestjs/common';
import { Doc } from 'src/common/doc/decorators/doc.decorator';

export function UserUserDeleteSelfDoc(): MethodDecorator {
    return applyDecorators(
        Doc<void>('user.deleteSelf', {
            auth: {
                jwtAccessToken: true,
            },
        })
    );
}
