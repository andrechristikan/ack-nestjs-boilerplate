import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaginationQuery } from '@common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@common/pagination/dtos/pagination.list.dto';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import { ResponsePaging } from '@common/response/decorators/response.decorator';
import { IResponsePaging } from '@common/response/interfaces/response.interface';
import { ActivityAdminListDoc } from '@module/activity/docs/activity.admin.doc';
import { ActivityListResponseDto } from '@module/activity/dtos/response/activity.list.response.dto';
import { IActivityDoc } from '@module/activity/interfaces/activity.interface';
import { ActivityService } from '@module/activity/services/activity.service';
import { ApiKeyProtected } from '@module/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@module/auth/decorators/auth.jwt.decorator';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from '@module/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '@module/policy/enums/policy.enum';
import { UserProtected } from '@module/user/decorators/user.decorator';
import { UserParsePipe } from '@module/user/pipes/user.parse.pipe';
import { UserDoc } from '@module/user/repository/entities/user.entity';

@ApiTags('modules.admin.activity')
@Controller({
    version: '1',
    path: '/activity/:user',
})
export class ActivityAdminController {
    constructor(
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService
    ) {}

    @ActivityAdminListDoc()
    @ResponsePaging('activity.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.ACTIVITY,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @Param('user', RequestRequiredPipe, UserParsePipe) user: UserDoc,
        @PaginationQuery()
        { _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<ActivityListResponseDto>> {
        const userHistories: IActivityDoc[] =
            await this.activityService.findAllByUser(
                user._id,
                {},
                {
                    paging: {
                        limit: _limit,
                        offset: _offset,
                    },
                    order: _order,
                }
            );
        const total: number = await this.activityService.getTotalByUser(
            user._id,
            {}
        );
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        const mapped = this.activityService.mapList(userHistories);

        return {
            _pagination: { total, totalPage },
            data: mapped,
        };
    }
}
