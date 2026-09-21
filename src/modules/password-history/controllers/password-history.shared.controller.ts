import type { PasswordHistorySharedListRequestDto } from '@modules/password-history/dtos/request/password-history.shared-list.request.dto';
import { PasswordHistorySharedListRequestSchema } from '@modules/password-history/dtos/request/password-history.shared-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { ResponsePagination } from '@common/response/decorators/response.decorator';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';

import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';

import { PasswordHistoryResponseSchema } from '@modules/password-history/dtos/response/password-history.response.dto';
import type { IPasswordHistoryList } from '@modules/password-history/interfaces/password-history.interface';
import { PasswordHistoryHttpService } from '@modules/password-history/services/password-history.http.service';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Controller, Get, Query } from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.shared.user.passwordHistory')
@Controller({
    version: '1',
    path: '/user/password-history',
})
export class PasswordHistorySharedController {
    constructor(
        private readonly passwordHistoryHttpService: PasswordHistoryHttpService
    ) {}

    @Doc({ summary: 'get all user password histories' })
    @ResponsePagination('passwordHistory.list', {
        schema: PasswordHistoryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/list')
    async list(
        @Query({ schema: PasswordHistorySharedListRequestSchema })
        query: PasswordHistorySharedListRequestDto,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponsePaginationReturn<IPasswordHistoryList>> {
        return this.passwordHistoryHttpService.getListCursor(userId, query);
    }
}
