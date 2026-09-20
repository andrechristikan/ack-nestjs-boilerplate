import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocResponsePagination,
} from '@common/doc/decorators/doc.decorator';
import { PasswordHistoryDefaultAvailableOrderBy } from '@modules/password-history/constants/password-history.list.constant';
import { PasswordHistoryResponseSchema } from '@modules/password-history/dtos/response/password-history.response.dto';
import type { PasswordHistoryResponseDto } from '@modules/password-history/dtos/response/password-history.response.dto';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';

export function PasswordHistoryAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all user password histories',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true, user: true }),
        DocResponsePagination<PasswordHistoryResponseDto>(
            'passwordHistory.list',
            {
                schema: PasswordHistoryResponseSchema,
                type: EnumPaginationType.offset,
                availableOrderBy: PasswordHistoryDefaultAvailableOrderBy,
            }
        )
    );
}
