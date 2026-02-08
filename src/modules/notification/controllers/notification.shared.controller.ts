import { PaginationCursorQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { ResponsePaging } from '@common/response/decorators/response.decorator';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { NotificationSharedListDoc } from '@modules/notification/docs/notification.shared.doc';
import { NotificationResponseDto } from '@modules/notification/dtos/response/notification.response.dto';
import { NotificationService } from '@modules/notification/services/notification.service';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Controller, Get } from '@nestjs/common';
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
    @Get('/list')
    async list(
        @PaginationCursorQuery()
        pagination: IPaginationQueryCursorParams,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponsePagingReturn<NotificationResponseDto>> {
        return this.notificationService.getListCursor(userId, pagination);
    }

    //     @NotificationSharedUpdateMarkAsReadDoc()
    //     @Response('notification.updateMarkAsRead')
    //     @TermPolicyAcceptanceProtected()
    //     @UserProtected()
    //     @AuthJwtAccessProtected()
    //     @ApiKeyProtected()
    //     @Patch('/update/read/:notificationId')
    //     async markAsRead(
    //         @AuthJwtPayload('userId') userId: string,
    //         @Param(
    //             'notificationId',
    //             RequestRequiredPipe,
    //             RequestIsValidObjectIdPipe
    //         )
    //         notificationId: string
    //     ): Promise<IResponseReturn<void>> {
    //         return this.notificationService.markAsRead(userId, notificationId);
    //     }
    //     @NotificationSharedUpdateMarkAllAsReadDoc()
    //     @Response('notification.updateMarkAllAsRead')
    //     @TermPolicyAcceptanceProtected()
    //     @UserProtected()
    //     @AuthJwtAccessProtected()
    //     @ApiKeyProtected()
    //     @HttpCode(HttpStatus.OK)
    //     @Post('/update/read/all')
    //     async markAllAsRead(
    //         @AuthJwtPayload('userId') userId: string
    //     ): Promise<IResponseReturn<void>> {
    //         return this.notificationService.markAllAsRead(userId);
    //     }
    //     @NotificationSharedUpdateUserSettingDoc()
    //     @Response('notification.updateUserSetting')
    //     @TermPolicyAcceptanceProtected()
    //     @UserProtected()
    //     @AuthJwtAccessProtected()
    //     @ApiKeyProtected()
    //     @Put('/update/setting')
    //     async updateUserSetting(
    //         @AuthJwtPayload('userId')
    //         userId: string,
    //         @Body()
    //         body: NotificationUserSettingRequestDto,
    //         @RequestIPAddress() ipAddress: string,
    //         @RequestUserAgent() userAgent: RequestUserAgentDto
    //     ): Promise<IResponseReturn<void>> {
    //         return this.notificationService.updateUserSetting(userId, body, {
    //             ipAddress,
    //             userAgent,
    //         });
    //     }
}
