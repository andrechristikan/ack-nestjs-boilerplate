import {
    PaginationCursorQuery,
    PaginationQueryFilterEqualString,
} from '@common/pagination/decorators/pagination.decorator';
import {
    IPaginationEqual,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import { ResponsePaging } from '@common/response/decorators/response.decorator';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogUserListDoc } from '@modules/activity-log/docs/activity-log.user.doc';
import { ActivityLogResponseDto } from '@modules/activity-log/dtos/response/activity-log.response.dto';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.user.activityLog')
@Controller({
    version: '1',
    path: '/activity-log',
})
export class ActivityLogUserController {
    constructor(private readonly activityLogService: ActivityLogService) {}

    @ActivityLogUserListDoc()
    @ResponsePaging('activityLog.list')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationCursorQuery()
        pagination: IPaginationQueryCursorParams,
        @PaginationQueryFilterEqualString('user')
        user?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>> {
        return this.activityLogService.getListCursor(pagination, user);
    }
}
