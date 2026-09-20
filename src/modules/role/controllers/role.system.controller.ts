import type { RoleSystemListRequestDto } from '@modules/role/dtos/request/role.system-list.request.dto';
import { RoleSystemListRequestSchema } from '@modules/role/dtos/request/role.system-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import { ResponsePagination } from '@common/response/decorators/response.decorator';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { ApiKeySystemProtected } from '@modules/api-key/decorators/api-key.decorator';
import { RoleListResponseSchema } from '@modules/role/dtos/response/role.list.response.dto';
import type { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleHttpService } from '@modules/role/services/role.http.service';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.system.role')
@Controller({
    version: '1',
    path: '/role',
})
export class RoleSystemController {
    constructor(private readonly roleHttpService: RoleHttpService) {}

    @Doc({ summary: 'get list of roles' })
    @ResponsePagination('role.list', { schema: RoleListResponseSchema })
    @ApiKeySystemProtected()
    @Get('/list')
    async list(
        @Query({ schema: RoleSystemListRequestSchema })
        query: RoleSystemListRequestDto
    ): Promise<IResponsePaginationReturn<RoleListResponseDto>> {
        return this.roleHttpService.getListCursorBySystem(query);
    }
}
