import type { NotificationListRequestDto } from '@modules/notification/dtos/request/notification.list.request.dto';
import { NotificationListRequestSchema } from '@modules/notification/dtos/request/notification.list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import {
    Response,
    ResponsePagination,
} from '@common/response/decorators/response.decorator';

import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';

import type { Notification } from '@generated/prisma-client/client';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';

import { NotificationUserSettingRequestSchema } from '@modules/notification/dtos/request/notification.user-setting.request.dto';
import type { NotificationUserSettingRequestDto } from '@modules/notification/dtos/request/notification.user-setting.request.dto';
import { NotificationResponseSchema } from '@modules/notification/dtos/response/notification.response.dto';
import { NotificationUserSettingResponseSchema } from '@modules/notification/dtos/response/notification.user-setting.response.dto';
import type { NotificationUserSettingResponseDto } from '@modules/notification/dtos/response/notification.user-setting.response.dto';
import { NotificationHttpService } from '@modules/notification/services/notification.http.service';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Put,
    Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.shared.notification')
@Controller({
    version: '1',
    path: '/notification',
})
export class NotificationSharedController {
    constructor(
        private readonly notificationHttpService: NotificationHttpService
    ) {}

    @Doc({ summary: 'Get all notifications for current user' })
    @ResponsePagination('notification.list', {
        schema: NotificationResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/list')
    async list(
        @Query({ schema: NotificationListRequestSchema })
        query: NotificationListRequestDto,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponsePaginationReturn<Notification>> {
        return this.notificationHttpService.getListCursor(userId, query);
    }

    @Doc({ summary: 'Get all notification settings for current user' })
    @Response('notification.listUserSetting', {
        schema: NotificationUserSettingResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/setting/list')
    async listUserSetting(
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponseReturn<NotificationUserSettingResponseDto>> {
        return this.notificationHttpService.getListUserSetting(userId);
    }

    @Doc({ summary: 'Mark a notification as read' })
    @Response('notification.markAsRead')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Patch('/update/:notificationId/read')
    async markAsRead(
        @AuthJwtPayload('userId') userId: string,
        @Param('notificationId', { schema: RequestUuidSchema })
        notificationId: string
    ): Promise<IResponseReturn<void>> {
        return this.notificationHttpService.markAsRead(userId, notificationId);
    }

    @Doc({ summary: 'Mark all notifications as read' })
    @Response('notification.markAllAsRead')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @HttpCode(HttpStatus.OK)
    @Post('/update/read')
    async markAllAsRead(
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponseReturn<void>> {
        return this.notificationHttpService.markAllAsRead(userId);
    }

    @Doc({ summary: 'update notification setting' })
    @Response('notification.updateUserSetting')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Put('/setting/update')
    async updateUserSetting(
        @AuthJwtPayload('userId')
        userId: string,
        @Body({ schema: NotificationUserSettingRequestSchema })
        body: NotificationUserSettingRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.notificationHttpService.updateUserSetting(userId, body);
    }
}
