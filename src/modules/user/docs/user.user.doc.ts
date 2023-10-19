import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';

export function UserUserDeleteSelfDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'user delete their account',
        }),
        DocAuth({
            apiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true }),
        DocResponse('user.deleteSelf')
    );
}
