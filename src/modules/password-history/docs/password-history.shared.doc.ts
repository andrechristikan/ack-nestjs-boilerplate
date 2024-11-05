import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { PasswordHistoryListResponseDto } from 'src/modules/password-history/dtos/response/password-history.list.response.dto';

export function PasswordHistorySharedListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all user password Histories',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponsePaging<PasswordHistoryListResponseDto>(
            'passwordHistory.list',
            {
                dto: PasswordHistoryListResponseDto,
            }
        )
    );
}
