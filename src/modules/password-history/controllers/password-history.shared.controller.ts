import { PaginationOffsetQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { ResponsePaging } from '@common/response/decorators/response.decorator';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { PasswordHistorySharedListDoc } from '@modules/password-history/docs/password-history.shared.doc';
import { PasswordHistoryResponseDto } from '@modules/password-history/dtos/response/password-history.response.dto';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.shared.user.passwordHistory')
@Controller({
    version: '1',
    path: '/password-history',
})
export class PasswordHistorySharedController {
    constructor(
        private readonly passwordHistoryService: PasswordHistoryService
    ) {}

    @PasswordHistorySharedListDoc()
    @ResponsePaging('passwordHistory.list')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationOffsetQuery()
        pagination: IPaginationQueryOffsetParams,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponsePagingReturn<PasswordHistoryResponseDto>> {
        return this.passwordHistoryService.getListCursorByUser(
            userId,
            pagination
        );
    }
}
