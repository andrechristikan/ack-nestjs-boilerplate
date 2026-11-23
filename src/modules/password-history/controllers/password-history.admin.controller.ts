import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
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
import { PasswordHistoryGetListOffsetByAdminUseCase } from '@modules/password-history/use-cases/password-history.get-list-offset-by-admin.use-case';
import {
    PolicyContext,
    PolicyProtected,
} from '@modules/policy/decorators/policy.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';

@ApiTags('modules.admin.user.passwordHistory')
@Controller({
    version: '1',
    path: '/user/:userId/password-history',
})
export class PasswordHistoryAdminController {
    constructor(
        private readonly passwordHistoryGetListOffsetByAdminUseCase: PasswordHistoryGetListOffsetByAdminUseCase
    ) {}

    @Doc({ summary: 'get all user password histories' })
    @ResponsePagination('passwordHistory.list', {
        schema: PasswordHistoryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected(
        {
            subject: EnumPolicySubject.User,
            action: [EnumPolicyAction.read],
        },
        {
            subject: EnumPolicySubject.PasswordHistory,
            action: [EnumPolicyAction.read],
        }
    )
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PolicyContext() policyContext: IPolicyContext,
        @Param('userId', { schema: RequestUuidSchema })
        userId: string,
        @Query({ schema: PasswordHistoryAdminListRequestSchema })
        query: PasswordHistoryAdminListRequestDto
    ): Promise<IResponsePaginationReturn<IPasswordHistoryList>> {
        return this.passwordHistoryGetListOffsetByAdminUseCase.execute(
            policyContext,
            userId,
            query
        );
    }
}
