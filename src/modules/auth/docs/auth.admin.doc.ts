import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { UserDocParamsId } from '@module/user/constants/user.doc.constant';

export function AuthAdminUpdatePasswordDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'admin update user password',
        }),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse('auth.updatePassword')
    );
}
