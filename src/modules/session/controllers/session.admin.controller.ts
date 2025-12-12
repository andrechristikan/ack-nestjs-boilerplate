import { PaginationOffsetQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import {
    RequestIPAddress,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import { RequestUserAgentDto } from '@common/request/dtos/request.user-agent.dto';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import { ResponsePaging } from '@common/response/decorators/response.decorator';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { ActivityLog } from '@modules/activity-log/decorators/activity-log.decorator';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { PolicyAbilityProtected } from '@modules/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@modules/policy/enums/policy.enum';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { SESSION_DEFAULT_AVAILABLE_ORDER_BY } from '@modules/session/constants/session.list.constant';
import {
    SessionAdminListDoc,
    SessionAdminRevokeDoc,
} from '@modules/session/docs/session.admin.doc';
import { SessionResponseDto } from '@modules/session/dtos/response/session.response.dto';
import { SessionService } from '@modules/session/services/session.service';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Controller, Delete, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EnumActivityLogAction, EnumRoleType } from '@prisma/client';

@ApiTags('modules.admin.user.session')
@Controller({
    version: '1',
    path: '/user/:userId/session',
})
export class SessionAdminController {
    constructor(private readonly sessionService: SessionService) {}

    @SessionAdminListDoc()
    @ResponsePaging('session.list')
    @PolicyAbilityProtected(
        {
            subject: ENUM_POLICY_SUBJECT.USER,
            action: [ENUM_POLICY_ACTION.READ],
        },
        {
            subject: ENUM_POLICY_SUBJECT.SESSION,
            action: [ENUM_POLICY_ACTION.READ],
        }
    )
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationOffsetQuery({
            availableOrderBy: SESSION_DEFAULT_AVAILABLE_ORDER_BY,
        })
        pagination: IPaginationQueryOffsetParams,
        @Param('userId', RequestRequiredPipe) userId: string
    ): Promise<IResponsePagingReturn<SessionResponseDto>> {
        return this.sessionService.getListOffsetByUser(userId, pagination);
    }

    @SessionAdminRevokeDoc()
    @ResponsePaging('session.revoke')
    @ActivityLog(EnumActivityLogAction.adminSessionRevoke)
    @PolicyAbilityProtected(
        {
            subject: ENUM_POLICY_SUBJECT.USER,
            action: [ENUM_POLICY_ACTION.READ],
        },
        {
            subject: ENUM_POLICY_SUBJECT.SESSION,
            action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.DELETE],
        }
    )
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/revoke/:sessionId')
    async revoke(
        @Param('userId', RequestRequiredPipe) userId: string,
        @Param('sessionId', RequestRequiredPipe) sessionId: string,
        @AuthJwtPayload('userId') revokeBy: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.sessionService.revokeByAdmin(
            userId,
            sessionId,
            {
                ipAddress,
                userAgent,
            },
            revokeBy
        );
    }
}
