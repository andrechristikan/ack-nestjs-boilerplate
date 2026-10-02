import { Doc } from '@common/doc/decorators/doc.decorator';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { ResponsePagination } from '@common/response/decorators/response.decorator';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { RoleSharedListRequestSchema } from '@modules/role/dtos/request/role.shared-list.request.dto';
import type { RoleSharedListRequestDto } from '@modules/role/dtos/request/role.shared-list.request.dto';
import { RoleListResponseSchema } from '@modules/role/dtos/response/role.list.response.dto';
import type { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleHttpService } from '@modules/role/services/role.http.service';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.shared.role')
@Controller({
    version: '1',
    path: '/role',
})
export class RoleSharedController {
    constructor(private readonly roleHttpService: RoleHttpService) {}

    @Doc({ summary: 'get the workspace or project role catalog' })
    @ResponsePagination('role.sharedList', { schema: RoleListResponseSchema })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/list')
    async list(
        @Query({ schema: RoleSharedListRequestSchema })
        query: RoleSharedListRequestDto
    ): Promise<IResponsePaginationReturn<RoleListResponseDto>> {
        return this.roleHttpService.getListOffsetByShared(query);
    }
}
