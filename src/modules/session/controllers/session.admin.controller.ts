import type { SessionAdminListRequestDto } from '@modules/session/dtos/request/session.admin-list.request.dto';
import { SessionAdminListRequestSchema } from '@modules/session/dtos/request/session.admin-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { RequestMongoIdSchema } from '@common/request/validations/request.mongo-id.validation';
import {
    Response,
    ResponsePagination,
} from '@common/response/decorators/response.decorator';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { SessionResponseSchema } from '@modules/session/dtos/response/session.response.dto';
import type { ISessionList } from '@modules/session/interfaces/session.interface';
import { SessionGetListOffsetByAdminUseCase } from '@modules/session/use-cases/session.get-list-offset-by-admin.use-case';
import { SessionRevokeByAdminUseCase } from '@modules/session/use-cases/session.revoke-by-admin.use-case';
import { SessionRevokeAllByAdminUseCase } from '@modules/session/use-cases/session.revoke-all-by-admin.use-case';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import {
    UserCurrent,
    UserProtected,
} from '@modules/user/decorators/user.decorator';
import type { IUser } from '@modules/user/interfaces/user.interface';
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
    constructor(
        private readonly sessionGetListOffsetByAdminUseCase: SessionGetListOffsetByAdminUseCase,
        private readonly sessionRevokeByAdminUseCase: SessionRevokeByAdminUseCase,
        private readonly sessionRevokeAllByAdminUseCase: SessionRevokeAllByAdminUseCase
    ) {}

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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @Query({ schema: SessionAdminListRequestSchema })
        query: SessionAdminListRequestDto,
        @Param('userId', { schema: RequestMongoIdSchema })
        userId: string
    ): Promise<IResponsePaginationReturn<ISessionList>> {
        return this.sessionGetListOffsetByAdminUseCase.execute(userId, query);
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/revoke/:sessionId')
    async revoke(
        @Param('userId', { schema: RequestMongoIdSchema })
        userId: string,
        @Param('sessionId', { schema: RequestMongoIdSchema })
        sessionId: string,
        @UserCurrent() user: IUser
    ): Promise<IResponseReturn<void>> {
        return this.sessionRevokeByAdminUseCase.execute(
            userId,
            sessionId,
            user
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
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/revoke-all')
    async revokeAll(
        @Param('userId', { schema: RequestMongoIdSchema })
        userId: string,
        @UserCurrent() user: IUser
    ): Promise<IResponseReturn<void>> {
        return this.sessionRevokeAllByAdminUseCase.execute(userId, user);
    }
}
