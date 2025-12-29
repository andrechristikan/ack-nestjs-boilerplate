import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { NotificationRegisterPushTokenRequestDto } from '@modules/notification/dtos/request/notification.push-token.request.dto';
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

export function NotificationSharedRegisterPushTokenDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'register push token',
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: NotificationRegisterPushTokenRequestDto,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ termPolicy: true }),
        DocResponse('notification.registerPushToken')
    );
}
