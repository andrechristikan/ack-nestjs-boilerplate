import type { NotificationListRequestDto } from '@modules/notification/dtos/request/notification.list.request.dto';
import { NotificationListRequestSchema } from '@modules/notification/dtos/request/notification.list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import {
    RequestContext,
    RequestThrottle,
} from '@common/request/decorators/request.decorator';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
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
import {
    ApiKeyContext,
    ApiKeyProtected,
} from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessContext,
    AuthJwtAccessProtected,
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
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';

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
        @RequestContext() requestContext: IRequestContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @Query({ schema: NotificationListRequestSchema })
        query: NotificationListRequestDto
    ): Promise<IResponsePaginationReturn<Notification>> {
        return this.notificationGetListCursorUseCase.execute(
            requestContext,
            authContext,
            query
        );
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
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext
    ): Promise<IResponseReturn<NotificationUserSettingResponseDto>> {
        return this.notificationGetListUserSettingUseCase.execute(authContext);
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
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @Param('notificationId', { schema: RequestUuidSchema })
        notificationId: string
    ): Promise<IResponseReturn<void>> {
        return this.notificationMarkAsReadUseCase.execute(
            authContext,
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
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext
    ): Promise<IResponseReturn<void>> {
        return this.notificationMarkAllAsReadUseCase.execute(authContext);
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
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @Body({ schema: NotificationUserSettingRequestSchema })
        body: NotificationUserSettingRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.notificationUpdateUserSettingUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            body
        );
    }
}
