import { PaginationCursorQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestThrottle } from '@common/request/decorators/request.throttler.decorator';
import { RequestIsValidObjectIdPipe } from '@common/request/pipes/request.is-valid-object-id.pipe';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
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
import { NotificationUserSettingRequestDto } from '@modules/notification/dtos/request/notification.user-setting.request.dto';
import { NotificationResponseDto } from '@modules/notification/dtos/response/notification.response.dto';
import { NotificationUserSettingResponseDto } from '@modules/notification/dtos/response/notification.user-setting.response.dto';
import { NotificationService } from '@modules/notification/services/notification.service';
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
    constructor(private readonly notificationService: NotificationService) {}

    @NotificationSharedListDoc()
    @ResponsePaging('notification.list')
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
    ): Promise<IResponsePagingReturn<NotificationResponseDto>> {
        return this.notificationService.getListCursor(userId, pagination);
    }

    @NotificationSharedListUserSettingDoc()
    @Response('notification.listUserSetting')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/setting/list')
    async listUserSetting(
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponseReturn<NotificationUserSettingResponseDto>> {
        return this.notificationService.getListUserSetting(userId);
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
        @Param(
            'notificationId',
            RequestRequiredPipe,
            RequestIsValidObjectIdPipe
        )
        notificationId: string
    ): Promise<IResponseReturn<void>> {
        return this.notificationService.markAsRead(userId, notificationId);
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
        return this.notificationService.markAllAsRead(userId);
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
        @Body()
        body: NotificationUserSettingRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.notificationService.updateUserSetting(userId, body);
    }
}
