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
import { NotificationDocParamsId } from '@modules/notification/constants/notification.doc';
import { NotificationUserSettingRequestDto } from '@modules/notification/dtos/request/notification.user-setting.request.dto';
import { NotificationResponseDto } from '@modules/notification/dtos/response/notification.response.dto';
import { applyDecorators } from '@nestjs/common';

export function NotificationSharedListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Get all notifications for current user',
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

export function NotificationSharedMarkAsReadDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Mark a notification as read',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ termPolicy: true }),
        DocRequest({
            params: NotificationDocParamsId,
        }),
        DocResponse('notification.markAsRead')
    );
}

export function NotificationSharedMarkAllAsReadDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Mark all notifications as read',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ termPolicy: true }),
        DocResponse('notification.markAllAsRead')
    );
}

export function NotificationSharedUpdateUserSettingDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update notification setting',
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: NotificationUserSettingRequestDto,
        }),
        DocGuard({
            termPolicy: true,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('notification.updateUserSetting')
    );
}
