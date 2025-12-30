import { PaginationCursorQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestUserAgent } from '@common/request/decorators/request.decorator';
import { RequestUserAgentDto } from '@common/request/dtos/request.user-agent.dto';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import {
    NotificationSharedListDoc,
    NotificationSharedMarkAllAsReadDoc,
    NotificationSharedMarkAsReadDoc,
    NotificationSharedRegisterPushTokenDoc,
    NotificationSharedRevokePushTokenDoc,
} from '@modules/notification/docs/notification.shared.doc';
import { NotificationRegisterPushTokenRequestDto } from '@modules/notification/dtos/request/notification.push-token.request.dto';
import { NotificationResponseDto } from '@modules/notification/dtos/response/notification.response.dto';
import { NotificationService } from '@modules/notification/services/notification.service';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.shared.user.notification')
@Controller({
    version: '1',
    path: '/user/notification',
})
export class NotificationSharedController {
    constructor(private readonly notificationService: NotificationService) {}

    @NotificationSharedListDoc()
    @ResponsePaging('notification.list')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationCursorQuery()
        pagination: IPaginationQueryCursorParams,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponsePagingReturn<NotificationResponseDto>> {
        return this.notificationService.getListCursor(userId, pagination);
    }

    @NotificationSharedRegisterPushTokenDoc()
    @Response('notification.registerPushToken')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/push-token/register')
    async registerPushToken(
        @AuthJwtPayload('userId') userId: string,
        @AuthJwtPayload('sessionId') sessionId: string,
        @Body() body: NotificationRegisterPushTokenRequestDto,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.notificationService.registerPushToken(
            userId,
            sessionId,
            body,
            userAgent
        );
    }

    @NotificationSharedRevokePushTokenDoc()
    @Response('notification.revokePushToken')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Delete('/push-token/revoke')
    async revokePushToken(
        @AuthJwtPayload('userId') userId: string,
        @AuthJwtPayload('sessionId') sessionId: string
    ): Promise<IResponseReturn<void>> {
        return this.notificationService.revokePushToken(userId, sessionId);
    }

    @NotificationSharedMarkAsReadDoc()
    @Response('notification.markAsRead')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/:notificationId/read')
    async markAsRead(
        @AuthJwtPayload('userId') userId: string,
        @Param('notificationId') notificationId: string
    ): Promise<IResponseReturn<void>> {
        return this.notificationService.markAsRead(userId, notificationId);
    }

    @NotificationSharedMarkAllAsReadDoc()
    @Response('notification.markAllAsRead')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/read-all')
    async markAllAsRead(
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponseReturn<void>> {
        return this.notificationService.markAllAsRead(userId);
    }
}

