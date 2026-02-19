import { PaginationOffsetQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestIsValidObjectIdPipe } from '@common/request/pipes/request.is-valid-object-id.pipe';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import { ResponsePaging } from '@common/response/decorators/response.decorator';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogAdminListDoc } from '@modules/activity-log/docs/activity-log.admin.doc';
import { ActivityLogResponseDto } from '@modules/activity-log/dtos/response/activity-log.response.dto';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { PolicyAbilityProtected } from '@modules/policy/decorators/policy.decorator';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EnumRoleType } from '@prisma/client';

@ApiTags('modules.admin.user.activityLog')
@Controller({
    version: '1',
    path: '/user/:userId/activity-log',
})
export class ActivityLogAdminController {
    constructor(private readonly activityLogService: ActivityLogService) {}

    @ActivityLogAdminListDoc()
    @ResponsePaging('activityLog.list')
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected(
        {
            subject: EnumPolicySubject.user,
            action: [EnumPolicyAction.read],
        },
        {
            subject: EnumPolicySubject.activityLog,
            action: [EnumPolicyAction.read],
        }
    )
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationOffsetQuery()
        pagination: IPaginationQueryOffsetParams,
        @Param('userId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        userId: string
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>> {
        return this.activityLogService.getListOffsetByAdmin(userId, pagination);
    }
}
