import type { SessionAdminListRequestDto } from '@modules/session/dtos/request/session.admin-list.request.dto';
import { SessionAdminListRequestSchema } from '@modules/session/dtos/request/session.admin-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import {
    Response,
    ResponsePagination,
} from '@common/response/decorators/response.decorator';

import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';

import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';

import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';
import { RoleProtected } from '@modules/role/decorators/role.decorator';

import { SessionResponseSchema } from '@modules/session/dtos/response/session.response.dto';
import type { ISessionList } from '@modules/session/interfaces/session.interface';
import { SessionHttpService } from '@modules/session/services/session.http.service';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Controller, Delete, Get, Param, Query } from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
} from '@generated/prisma-client/client';

@ApiTags('modules.admin.user.session')
@Controller({
    version: '1',
    path: '/user/:userId/session',
})
export class SessionAdminController {
    constructor(private readonly sessionHttpService: SessionHttpService) {}

    @Doc({ summary: 'admin get all user Sessions' })
    @ResponsePagination('session.list', { schema: SessionResponseSchema })
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
        @Query({ schema: SessionAdminListRequestSchema })
        query: SessionAdminListRequestDto,
        @Param('userId', { schema: RequestUuidSchema })
        userId: string
    ): Promise<IResponsePaginationReturn<ISessionList>> {
        return this.sessionHttpService.getListOffsetByAdmin(userId, query);
    }

    @Doc({ summary: 'admin revoke user Session' })
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

    @Doc({ summary: 'admin revoke all user Sessions' })
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
