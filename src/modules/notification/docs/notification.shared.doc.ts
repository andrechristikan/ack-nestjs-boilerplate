import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePagination,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { NotificationDefaultAvailableOrderBy } from '@modules/notification/constants/notification.list.constant';
import { NotificationResponseSchema } from '@modules/notification/dtos/response/notification.response.dto';
import type { NotificationResponseDto } from '@modules/notification/dtos/response/notification.response.dto';
import { NotificationUserSettingResponseSchema } from '@modules/notification/dtos/response/notification.user-setting.response.dto';
import type { NotificationUserSettingResponseDto } from '@modules/notification/dtos/response/notification.user-setting.response.dto';
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
        DocGuard({ termPolicy: true, user: true }),
        DocResponsePagination<NotificationResponseDto>('notification.list', {
            schema: NotificationResponseSchema,
            availableOrderBy: NotificationDefaultAvailableOrderBy,
            type: EnumPaginationType.cursor,
        })
    );
}

export function NotificationSharedListUserSettingDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Get all notification settings for current user',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ termPolicy: true, user: true }),
        DocResponse<NotificationUserSettingResponseDto>(
            'notification.listUserSetting',
            {
                schema: NotificationUserSettingResponseSchema,
            }
        )
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
        DocGuard({ termPolicy: true, user: true }),
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
        DocGuard({ termPolicy: true, user: true }),
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
        }),
        DocGuard({ termPolicy: true, user: true }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('notification.updateUserSetting')
    );
}
