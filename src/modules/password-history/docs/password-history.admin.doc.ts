import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { UserDocParamsId } from '@modules/user/constants/user.doc.constant';
import { PasswordHistoryResponseDto } from '@modules/password-history/dtos/response/password-history.response.dto';

export function PasswordHistoryAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all user password histories',
        }),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponsePaging<PasswordHistoryResponseDto>('passwordHistory.list', {
            dto: PasswordHistoryResponseDto,
        })
    );
}
