import { PaginationCursorQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { ResponsePaging } from '@common/response/decorators/response.decorator';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { NotificationSharedListDoc } from '@modules/notification/docs/notification.shared.doc';
import { NotificationResponseDto } from '@modules/notification/dtos/response/notification.response.dto';
import { NotificationService } from '@modules/notification/services/notification.service';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Controller, Get } from '@nestjs/common';
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
}
