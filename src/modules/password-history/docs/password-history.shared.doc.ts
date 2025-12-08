import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { PasswordHistoryResponseDto } from '@modules/password-history/dtos/response/password-history.response.dto';
import { ENUM_PAGINATION_TYPE } from '@common/pagination/enums/pagination.enum';

export function PasswordHistorySharedListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all user password Histories',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponsePaging<PasswordHistoryResponseDto>('passwordHistory.list', {
            dto: PasswordHistoryResponseDto,
            type: ENUM_PAGINATION_TYPE.CURSOR,
        })
    );
}
