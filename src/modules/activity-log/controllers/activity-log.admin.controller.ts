import type { ActivityLogAdminListRequestDto } from '@modules/activity-log/dtos/request/activity-log.admin-list.request.dto';
import { ActivityLogAdminListRequestSchema } from '@modules/activity-log/dtos/request/activity-log.admin-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import { ResponsePagination } from '@common/response/decorators/response.decorator';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';

import { ActivityLogResponseSchema } from '@modules/activity-log/dtos/response/activity-log.response.dto';
import type { IActivityLog } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogHttpService } from '@modules/activity-log/services/activity-log.http.service';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
} from '@generated/prisma-client/client';

@ApiTags('modules.admin.activityLog')
@Controller({
    version: '1',
    path: '/activity-log',
})
export class ActivityLogAdminController {
    constructor(
        private readonly activityLogHttpService: ActivityLogHttpService
    ) {}

    @Doc({ summary: 'get all activity logs of a user' })
    @ResponsePagination('activityLog.listByUser', {
        schema: ActivityLogResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected(
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
    @RequestThrottle({ user: true })
    @Get('/user/:userId/list')
    async listByUser(
        @Query({ schema: ActivityLogAdminListRequestSchema })
        query: ActivityLogAdminListRequestDto,
        @Param('userId', { schema: RequestUuidSchema })
        userId: string
    ): Promise<IResponsePaginationReturn<IActivityLog>> {
        return this.activityLogHttpService.getListOffsetByUser(userId, query);
    }

    @Doc({ summary: 'get all activity logs of a workspace' })
    @ResponsePagination('activityLog.listByWorkspace', {
        schema: ActivityLogResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected(
        {
            subject: EnumPolicySubject.workspace,
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
    @RequestThrottle({ user: true })
    @Get('/workspace/:workspaceId/list')
    async listByWorkspace(
        @Query({ schema: ActivityLogAdminListRequestSchema })
        query: ActivityLogAdminListRequestDto,
        @Param('workspaceId', { schema: RequestUuidSchema })
        workspaceId: string,
        @Query('userId', { schema: RequestUuidSchema.optional() })
        userId?: string
    ): Promise<IResponsePaginationReturn<IActivityLog>> {
        return this.activityLogHttpService.getListOffsetByWorkspace(
            workspaceId,
            userId ?? null,
            query
        );
    }
}
