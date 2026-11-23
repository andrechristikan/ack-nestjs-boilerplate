import type { ActivityLogAdminListRequestDto } from '@modules/activity-log/dtos/request/activity-log.admin-list.request.dto';
import { ActivityLogAdminListRequestSchema } from '@modules/activity-log/dtos/request/activity-log.admin-list.request.dto';
import type { ActivityLogAdminWorkspaceListRequestDto } from '@modules/activity-log/dtos/request/activity-log.admin-workspace-list.request.dto';
import { ActivityLogAdminWorkspaceListRequestSchema } from '@modules/activity-log/dtos/request/activity-log.admin-workspace-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import { ResponsePagination } from '@common/response/decorators/response.decorator';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogResponseSchema } from '@modules/activity-log/dtos/response/activity-log.response.dto';
import type { IActivityLog } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogGetListOffsetByUserUseCase } from '@modules/activity-log/use-cases/activity-log.get-list-offset-by-user.use-case';
import { ActivityLogGetListOffsetByWorkspaceUseCase } from '@modules/activity-log/use-cases/activity-log.get-list-offset-by-workspace.use-case';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';

@ApiTags('modules.admin.activityLog')
@Controller({
    version: '1',
    path: '/activity-log',
})
export class ActivityLogAdminController {
    constructor(
        private readonly activityLogGetListOffsetByUserUseCase: ActivityLogGetListOffsetByUserUseCase,
        private readonly activityLogGetListOffsetByWorkspaceUseCase: ActivityLogGetListOffsetByWorkspaceUseCase
    ) {}

    @Doc({ summary: 'get all activity logs of a user' })
    @ResponsePagination('activityLog.listByUser', {
        schema: ActivityLogResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected(
        {
            subject: EnumPolicySubject.User,
            action: [EnumPolicyAction.read],
        },
        {
            subject: EnumPolicySubject.ActivityLog,
            action: [EnumPolicyAction.read],
        }
    )
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/user/:userId/list')
    async listByUser(
        @Param('userId', { schema: RequestUuidSchema })
        userId: string,
        @Query({ schema: ActivityLogAdminListRequestSchema })
        query: ActivityLogAdminListRequestDto
    ): Promise<IResponsePaginationReturn<IActivityLog>> {
        return this.activityLogGetListOffsetByUserUseCase.execute(
            userId,
            query
        );
    }

    @Doc({ summary: 'get all activity logs of a workspace' })
    @ResponsePagination('activityLog.listByWorkspace', {
        schema: ActivityLogResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected(
        {
            subject: EnumPolicySubject.Workspace,
            action: [EnumPolicyAction.read],
        },
        {
            subject: EnumPolicySubject.ActivityLog,
            action: [EnumPolicyAction.read],
        }
    )
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/workspace/:workspaceId/list')
    async listByWorkspace(
        @Param('workspaceId', { schema: RequestUuidSchema })
        workspaceId: string,
        @Query({ schema: ActivityLogAdminWorkspaceListRequestSchema })
        query: ActivityLogAdminWorkspaceListRequestDto
    ): Promise<IResponsePaginationReturn<IActivityLog>> {
        return this.activityLogGetListOffsetByWorkspaceUseCase.execute(
            workspaceId,
            query
        );
    }
}
