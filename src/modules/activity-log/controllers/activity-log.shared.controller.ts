import type { ActivityLogSharedListRequestDto } from '@modules/activity-log/dtos/request/activity-log.shared-list.request.dto';
import { ActivityLogSharedListRequestSchema } from '@modules/activity-log/dtos/request/activity-log.shared-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { ResponsePagination } from '@common/response/decorators/response.decorator';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';

import type { Workspace } from '@generated/prisma-client/client';

import { ActivityLogResponseSchema } from '@modules/activity-log/dtos/response/activity-log.response.dto';
import type { IActivityLog } from '@modules/activity-log/interfaces/activity-log.interface';
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

import { Controller, Get, Query } from '@nestjs/common';

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

    @Doc({ summary: 'get my own activity logs' })
    @ResponsePagination('activityLog.listSelf', {
        schema: ActivityLogResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/list')
    async listSelf(
        @Query({ schema: ActivityLogSharedListRequestSchema })
        query: ActivityLogSharedListRequestDto,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponsePaginationReturn<IActivityLog>> {
        return this.activityLogHttpService.getListCursorByUser(userId, query);
    }

    @Doc({ summary: 'get my own activity logs in the current workspace' })
    @ResponsePagination('activityLog.listSelfByWorkspace', {
        schema: ActivityLogResponseSchema,
    })
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
        @Query({ schema: ActivityLogSharedListRequestSchema })
        query: ActivityLogSharedListRequestDto,
        @AuthJwtPayload('userId') userId: string,
        @WorkspaceCurrent() workspace: Workspace
    ): Promise<IResponsePaginationReturn<IActivityLog>> {
        return this.activityLogHttpService.getListCursorByWorkspace(
            workspace.id,
            userId,
            query
        );
    }
}
