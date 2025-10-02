import {
    PaginationOffsetQuery,
    PaginationQueryFilterEqualString,
} from '@common/pagination/decorators/pagination.decorator';
import {
    IPaginationEqual,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { ResponsePaging } from '@common/response/decorators/response.decorator';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogAdminListDoc } from '@modules/activity-log/docs/activity-log.admin.doc';
import { ActivityLogResponseDto } from '@modules/activity-log/dtos/response/activity-log.response.dto';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { PolicyAbilityProtected } from '@modules/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@modules/policy/enums/policy.enum';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ENUM_ROLE_TYPE } from '@prisma/client';

@ApiTags('modules.admin.activityLog')
@Controller({
    version: '1',
    path: '/activity-log',
})
export class UserAdminController {
    constructor(private readonly activityLogService: ActivityLogService) {}

    @ActivityLogAdminListDoc()
    @ResponsePaging('activityLog.list')
    @PolicyAbilityProtected(
        {
            subject: ENUM_POLICY_SUBJECT.USER,
            action: [ENUM_POLICY_ACTION.READ],
        },
        {
            subject: ENUM_POLICY_SUBJECT.ACTIVITY_LOG,
            action: [ENUM_POLICY_ACTION.READ],
        }
    )
    @RoleProtected(ENUM_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationOffsetQuery()
        pagination: IPaginationQueryOffsetParams,
        @PaginationQueryFilterEqualString('user')
        user?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>> {
        return this.activityLogService.getListOffset(pagination, user);
    }
}
