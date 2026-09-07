import {
    PaginationCursorQuery,
    PaginationQueryFilterInEnum,
} from '@common/pagination/decorators/pagination.decorator';
import {
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import { ResponsePaging } from '@common/response/decorators/response.decorator';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { EnumRoleType, Prisma } from '@generated/prisma-client';
import { ApiKeySystemProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    RoleDefaultAvailableOrderBy,
    RoleDefaultAvailableSearch,
    RoleDefaultType,
} from '@modules/role/constants/role.list.constant';
import { RoleSystemListDoc } from '@modules/role/docs/role.system.doc';
import {
    RoleListResponseDto,
    RoleListResponseSchema,
} from '@modules/role/dtos/response/role.list.response.dto';
import { RoleHttpService } from '@modules/role/services/role.http.service';
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.system.role')
@Controller({
    version: '1',
    path: '/role',
})
export class RoleSystemController {
    constructor(private readonly roleHttpService: RoleHttpService) {}

    @RoleSystemListDoc()
    @ResponsePaging('role.list', { schema: RoleListResponseSchema })
    @ApiKeySystemProtected()
    @Get('/list')
    async list(
        @PaginationCursorQuery({
            availableSearch: RoleDefaultAvailableSearch,
            availableOrderBy: RoleDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryCursorParams<Prisma.RoleWhereInput>,
        @PaginationQueryFilterInEnum<EnumRoleType>('type', RoleDefaultType)
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<RoleListResponseDto>> {
        return this.roleHttpService.getListCursorBySystem(pagination, type);
    }
}
