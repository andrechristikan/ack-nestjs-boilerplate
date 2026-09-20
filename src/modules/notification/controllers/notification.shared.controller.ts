import { PaginationCursorQuery } from '@common/pagination/decorators/pagination.decorator';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import type {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Notification } from '@generated/prisma-client/client';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import {
    NotificationSharedListDoc,
    NotificationSharedListUserSettingDoc,
    NotificationSharedMarkAllAsReadDoc,
    NotificationSharedMarkAsReadDoc,
    NotificationSharedUpdateUserSettingDoc,
} from '@modules/notification/docs/notification.shared.doc';
import { NotificationDefaultAvailableOrderBy } from '@modules/notification/constants/notification.list.constant';
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

    @NotificationSharedListDoc()
    @ResponsePaging('notification.list', {
        schema: NotificationResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/list')
    async list(
        @PaginationCursorQuery({
            availableOrderBy: NotificationDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryCursorParams<Prisma.NotificationWhereInput>,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponsePagingReturn<Notification>> {
        return this.notificationHttpService.getListCursor(userId, pagination);
    }

    @NotificationSharedListUserSettingDoc()
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

    @NotificationSharedMarkAsReadDoc()
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

    @NotificationSharedMarkAllAsReadDoc()
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

    @NotificationSharedUpdateUserSettingDoc()
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
