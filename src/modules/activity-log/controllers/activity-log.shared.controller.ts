import { PaginationCursorQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { ResponsePaging } from '@common/response/decorators/response.decorator';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogSharedListDoc } from '@modules/activity-log/docs/activity-log.shared.doc';
import { ActivityLogResponseDto } from '@modules/activity-log/dtos/response/activity-log.response.dto';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { AuthJwtPayload } from '@modules/auth/decorators/auth.jwt.decorator';
import {
    PolicyAbilityCurrent,
    PolicyAbilityProtected,
} from '@modules/policy/decorators/policy.decorator';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';
import { PolicyAbility } from '@modules/policy/interfaces/policy.interface';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.shared.user.activityLog')
@Controller({
    version: '1',
    path: '/user/activity-log',
})
export class ActivityLogSharedController {
    constructor(private readonly activityLogService: ActivityLogService) {}

    @ActivityLogSharedListDoc()
    @ResponsePaging('activityLog.list')
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.activityLog,
        action: [EnumPolicyAction.read],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @AuthJwtPayload('userId') userId: string,
        @PolicyAbilityCurrent() ability: PolicyAbility,
        @PaginationCursorQuery()
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>> {
        return this.activityLogService.getListCursor(userId, pagination, ability);
    }
}
