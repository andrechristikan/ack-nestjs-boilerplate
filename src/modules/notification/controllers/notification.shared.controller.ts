import type { NotificationListRequestDto } from '@modules/notification/dtos/request/notification.list.request.dto';
import { NotificationListRequestSchema } from '@modules/notification/dtos/request/notification.list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { RequestMongoIdSchema } from '@common/request/validations/request.mongo-id.validation';
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
import { NotificationGetListCursorUseCase } from '@modules/notification/use-cases/notification.get-list-cursor.use-case';
import { NotificationGetListUserSettingUseCase } from '@modules/notification/use-cases/notification.get-list-user-setting.use-case';
import { NotificationMarkAsReadUseCase } from '@modules/notification/use-cases/notification.mark-as-read.use-case';
import { NotificationMarkAllAsReadUseCase } from '@modules/notification/use-cases/notification.mark-all-as-read.use-case';
import { NotificationUpdateUserSettingUseCase } from '@modules/notification/use-cases/notification.update-user-setting.use-case';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
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
        private readonly notificationGetListCursorUseCase: NotificationGetListCursorUseCase,
        private readonly notificationGetListUserSettingUseCase: NotificationGetListUserSettingUseCase,
        private readonly notificationMarkAsReadUseCase: NotificationMarkAsReadUseCase,
        private readonly notificationMarkAllAsReadUseCase: NotificationMarkAllAsReadUseCase,
        private readonly notificationUpdateUserSettingUseCase: NotificationUpdateUserSettingUseCase
    ) {}

    @Doc({ summary: 'get all notifications for current user' })
    @ResponsePagination('notification.list', {
        schema: NotificationResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @Query({ schema: NotificationListRequestSchema })
        query: NotificationListRequestDto,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponsePaginationReturn<Notification>> {
        return this.notificationGetListCursorUseCase.execute(userId, query);
    }

    @Doc({ summary: 'get all notification settings for current user' })
    @Response('notification.listUserSetting', {
        schema: NotificationUserSettingResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/setting/list')
    async listUserSetting(
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponseReturn<NotificationUserSettingResponseDto>> {
        return this.notificationGetListUserSettingUseCase.execute(userId);
    }

    @Doc({ summary: 'mark a notification as read' })
    @Response('notification.markAsRead')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:notificationId/read')
    async markAsRead(
        @AuthJwtPayload('userId') userId: string,
        @Param('notificationId', { schema: RequestMongoIdSchema })
        notificationId: string
    ): Promise<IResponseReturn<void>> {
        return this.notificationMarkAsReadUseCase.execute(
            userId,
            notificationId
        );
    }

    @Doc({ summary: 'mark all notifications as read' })
    @Response('notification.markAllAsRead')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/read-all')
    async markAllAsRead(
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponseReturn<void>> {
        return this.notificationMarkAllAsReadUseCase.execute(userId);
    }

    @Doc({ summary: 'update notification setting' })
    @Response('notification.updateUserSetting')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/setting/update')
    async updateUserSetting(
        @AuthJwtPayload('userId')
        userId: string,
        @Body({ schema: NotificationUserSettingRequestSchema })
        body: NotificationUserSettingRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.notificationUpdateUserSettingUseCase.execute(userId, body);
    }
}
