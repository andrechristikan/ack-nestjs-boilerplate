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

/**
 * Documentation for listing user notifications
 */
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

/**
 * Documentation for registering push notification token
 */
export function NotificationSharedRegisterPushTokenDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Register push notification token for current session',
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

/**
 * Documentation for revoking push notification token
 */
export function NotificationSharedRevokePushTokenDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Revoke push notification token for current session',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ termPolicy: true }),
        DocResponse('notification.revokePushToken')
    );
}

/**
 * Documentation for marking notification as read
 */
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
        DocResponse('notification.markAsRead')
    );
}

/**
 * Documentation for marking all notifications as read
 */
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

