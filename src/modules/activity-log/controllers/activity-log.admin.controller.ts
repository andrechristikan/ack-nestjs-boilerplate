import { PaginationOffsetQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestThrottle } from '@common/request/decorators/request.throttler.decorator';
import { RequestIsValidUuidPipe } from '@common/request/pipes/request.is-valid-uuid.pipe';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import { ResponsePaging } from '@common/response/decorators/response.decorator';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogDefaultAvailableOrderBy } from '@modules/activity-log/constants/activity-log.list.constant';
import {
    ActivityLogAdminListByUserDoc,
    ActivityLogAdminListByWorkspaceDoc,
} from '@modules/activity-log/docs/activity-log.admin.doc';
import { ActivityLogResponseSchema } from '@modules/activity-log/dtos/response/activity-log.response.dto';
import { IActivityLog } from '@modules/activity-log/interfaces/activity-log.interface';
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
    Prisma,
} from '@generated/prisma-client';

@ApiTags('modules.admin.activityLog')
@Controller({
    version: '1',
    path: '/activity-log',
})
export class ActivityLogAdminController {
    constructor(
        private readonly activityLogHttpService: ActivityLogHttpService
    ) {}

    @ActivityLogAdminListByUserDoc()
    @ResponsePaging('activityLog.listByUser', {
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
        @PaginationOffsetQuery({
            availableOrderBy: ActivityLogDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>,
        @Param('userId', RequestRequiredPipe, RequestIsValidUuidPipe)
        userId: string
    ): Promise<IResponsePagingReturn<IActivityLog>> {
        return this.activityLogHttpService.getListOffsetByUser(
            userId,
            pagination
        );
    }

    @ActivityLogAdminListByWorkspaceDoc()
    @ResponsePaging('activityLog.listByWorkspace', {
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
        @PaginationOffsetQuery({
            availableOrderBy: ActivityLogDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>,
        @Param('workspaceId', RequestRequiredPipe, RequestIsValidUuidPipe)
        workspaceId: string,
        @Query('userId', new RequestIsValidUuidPipe({ optional: true }))
        userId?: string
    ): Promise<IResponsePagingReturn<IActivityLog>> {
        return this.activityLogHttpService.getListOffsetByWorkspace(
            workspaceId,
            userId ?? null,
            pagination
        );
    }
}
