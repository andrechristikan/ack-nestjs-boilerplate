import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { PasswordHistoryListResponseDto } from '@module/password-history/dtos/response/password-history.list.response.dto';
import { UserDocParamsId } from '@module/user/constants/user.doc.constant';

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
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<PasswordHistoryListResponseDto>(
            'passwordHistory.list',
            {
                dto: PasswordHistoryListResponseDto,
            }
        )
    );
}
