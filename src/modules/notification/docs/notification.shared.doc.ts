import {
    Doc,
    DocAuth,
    DocGuard,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { NotificationResponseDto } from '@modules/notification/dtos/response/notification.response.dto';
import { applyDecorators } from '@nestjs/common';

export function NotificationSharedListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all notifications',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ termPolicy: true }),
        DocResponsePaging<NotificationResponseDto>('notification.list', {
            dto: NotificationResponseDto,
            type: EnumPaginationType.cursor,
        })
    );
}
