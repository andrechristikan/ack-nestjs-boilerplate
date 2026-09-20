import {
    PaginationOffsetQuery,
    PaginationQueryFilterEqualBoolean,
} from '@common/pagination/decorators/pagination.decorator';
import type {
    IPaginationEqual,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import type {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { SessionDefaultAvailableOrderBy } from '@modules/session/constants/session.list.constant';
import {
    SessionAdminListDoc,
    SessionAdminRevokeAllDoc,
    SessionAdminRevokeDoc,
} from '@modules/session/docs/session.admin.doc';
import { SessionResponseSchema } from '@modules/session/dtos/response/session.response.dto';
import type { ISessionList } from '@modules/session/interfaces/session.interface';
import { SessionHttpService } from '@modules/session/services/session.http.service';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Controller, Delete, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
    Prisma,
} from '@generated/prisma-client/client';

@ApiTags('modules.admin.user.session')
@Controller({
    version: '1',
    path: '/user/:userId/session',
})
export class SessionAdminController {
    constructor(private readonly sessionHttpService: SessionHttpService) {}

    @SessionAdminListDoc()
    @ResponsePaging('session.list', { schema: SessionResponseSchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected(
        {
            subject: EnumPolicySubject.user,
            action: [EnumPolicyAction.read],
        },
        {
            subject: EnumPolicySubject.session,
            action: [EnumPolicyAction.read],
        }
    )
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/list')
    async list(
        @PaginationOffsetQuery({
            availableOrderBy: SessionDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.SessionWhereInput>,
        @Param('userId', { schema: RequestUuidSchema })
        userId: string,
        @PaginationQueryFilterEqualBoolean('isRevoked')
        isRevoked?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<ISessionList>> {
        return this.sessionHttpService.getListOffsetByAdmin(
            userId,
            pagination,
            isRevoked
        );
    }

    @SessionAdminRevokeDoc()
    @Response('session.revoke')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected(
        {
            subject: EnumPolicySubject.user,
            action: [EnumPolicyAction.read],
        },
        {
            subject: EnumPolicySubject.session,
            action: [EnumPolicyAction.read, EnumPolicyAction.delete],
        }
    )
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Delete('/revoke/:sessionId')
    async revoke(
        @Param('userId', { schema: RequestUuidSchema })
        userId: string,
        @Param('sessionId', { schema: RequestUuidSchema })
        sessionId: string,
        @AuthJwtPayload('userId') revokedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.sessionHttpService.revokeByAdmin(
            userId,
            sessionId,
            revokedBy
        );
    }

    @SessionAdminRevokeAllDoc()
    @Response('session.revokeAll')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected(
        {
            subject: EnumPolicySubject.user,
            action: [EnumPolicyAction.read],
        },
        {
            subject: EnumPolicySubject.session,
            action: [EnumPolicyAction.read, EnumPolicyAction.delete],
        }
    )
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Delete('/revoke-all')
    async revokeAll(
        @Param('userId', { schema: RequestUuidSchema })
        userId: string,
        @AuthJwtPayload('userId') revokedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.sessionHttpService.revokeAllByAdmin(userId, revokedBy);
    }
}
