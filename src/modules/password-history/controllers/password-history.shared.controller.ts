import { PaginationCursorQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestThrottle } from '@common/request/decorators/request.throttler.decorator';
import { ResponsePaging } from '@common/response/decorators/response.decorator';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { PasswordHistoryCursorAvailableOrderBy } from '@modules/password-history/constants/password-history.list.constant';
import { PasswordHistorySharedListDoc } from '@modules/password-history/docs/password-history.shared.doc';
import { PasswordHistoryResponseDto } from '@modules/password-history/dtos/response/password-history.response.dto';
import { PasswordHistoryHttpService } from '@modules/password-history/services/password-history.http.service';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Controller, Get } from '@nestjs/common';
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

    @PasswordHistorySharedListDoc()
    @ResponsePaging('passwordHistory.list')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/list')
    async list(
        @PaginationCursorQuery({
            availableOrderBy: PasswordHistoryCursorAvailableOrderBy,
        })
        pagination: IPaginationQueryCursorParams<Prisma.PasswordHistoryWhereInput>,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponsePagingReturn<PasswordHistoryResponseDto>> {
        return this.passwordHistoryHttpService.getListCursor(
            userId,
            pagination
        );
    }
}
