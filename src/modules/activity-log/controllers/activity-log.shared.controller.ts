import { PaginationCursorQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestThrottle } from '@common/request/decorators/request.throttler.decorator';
import { ResponsePaging } from '@common/response/decorators/response.decorator';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma, Workspace } from '@generated/prisma-client';
import { ActivityLogDefaultAvailableOrderBy } from '@modules/activity-log/constants/activity-log.list.constant';
import {
    ActivityLogSharedListSelfByWorkspaceDoc,
    ActivityLogSharedListSelfDoc,
} from '@modules/activity-log/docs/activity-log.shared.doc';
import { ActivityLogResponseDto } from '@modules/activity-log/dtos/response/activity-log.response.dto';
import { ActivityLogHttpService } from '@modules/activity-log/services/activity-log.http.service';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { FeatureFlagProtected } from '@modules/feature-flag/decorators/feature-flag.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    WorkspaceCurrent,
    WorkspaceMemberProtected,
    WorkspaceProtected,
} from '@modules/workspace/decorators/workspace.decorator';
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.shared.user.activityLog')
@Controller({
    version: '1',
    path: '/user/activity-log',
})
export class ActivityLogSharedController {
    constructor(
        private readonly activityLogHttpService: ActivityLogHttpService
    ) {}

    @ActivityLogSharedListSelfDoc()
    @ResponsePaging('activityLog.listSelf')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/list')
    async listSelf(
        @PaginationCursorQuery({
            availableOrderBy: ActivityLogDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryCursorParams<Prisma.ActivityLogWhereInput>,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>> {
        return this.activityLogHttpService.getListCursorByUser(userId, pagination);
    }

    @ActivityLogSharedListSelfByWorkspaceDoc()
    @ResponsePaging('activityLog.listSelfByWorkspace')
    @TermPolicyAcceptanceProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/workspace/list')
    async listSelfByWorkspace(
        @PaginationCursorQuery({
            availableOrderBy: ActivityLogDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryCursorParams<Prisma.ActivityLogWhereInput>,
        @AuthJwtPayload('userId') userId: string,
        @WorkspaceCurrent() workspace: Workspace
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>> {
        return this.activityLogHttpService.getListCursorByWorkspace(
            workspace.id,
            userId,
            pagination
        );
    }
}
