import type { PasswordHistoryAdminListRequestDto } from '@modules/password-history/dtos/request/password-history.admin-list.request.dto';
import { PasswordHistoryAdminListRequestSchema } from '@modules/password-history/dtos/request/password-history.admin-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import { ResponsePagination } from '@common/response/decorators/response.decorator';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';

import { PasswordHistoryResponseSchema } from '@modules/password-history/dtos/response/password-history.response.dto';
import type { IPasswordHistoryList } from '@modules/password-history/interfaces/password-history.interface';
import { PasswordHistoryHttpService } from '@modules/password-history/services/password-history.http.service';
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

@ApiTags('modules.admin.user.passwordHistory')
@Controller({
    version: '1',
    path: '/user/:userId/password-history',
})
export class PasswordHistoryAdminController {
    constructor(
        private readonly passwordHistoryHttpService: PasswordHistoryHttpService
    ) {}

    @Doc({ summary: 'get all user password histories' })
    @ResponsePagination('passwordHistory.list', {
        schema: PasswordHistoryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected(
        {
            subject: EnumPolicySubject.user,
            action: [EnumPolicyAction.read],
        },
        {
            subject: EnumPolicySubject.passwordHistory,
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
        @Query({ schema: PasswordHistoryAdminListRequestSchema })
        query: PasswordHistoryAdminListRequestDto,
        @Param('userId', { schema: RequestUuidSchema })
        userId: string
    ): Promise<IResponsePaginationReturn<IPasswordHistoryList>> {
        return this.passwordHistoryHttpService.getListOffsetByAdmin(
            userId,
            query
        );
    }
}
