import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { PasswordHistoryResponseDto } from '@modules/password-history/dtos/response/password-history.response.dto';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';

export function PasswordHistorySharedListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all user password Histories',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ termPolicy: true }),
        DocResponsePaging<PasswordHistoryResponseDto>('passwordHistory.list', {
            dto: PasswordHistoryResponseDto,
            type: EnumPaginationType.cursor,
        })
    );
}
