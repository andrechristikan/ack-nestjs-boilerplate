import { IDatabaseFilterOperation } from '@common/database/interfaces/database.interface';
import {
    PaginationQuery,
    PaginationQueryFilterInEnum,
} from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryReturn } from '@common/pagination/interfaces/pagination.interface';
import { ResponsePaging } from '@common/response/decorators/response.decorator';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { ENUM_POLICY_ROLE_TYPE } from '@modules/policy/enums/policy.enum';
import {
    ROLE_DEFAULT_AVAILABLE_SEARCH,
    ROLE_DEFAULT_ROLE_TYPE,
} from '@modules/role/constants/role.list.constant';
import { RoleSystemListDoc } from '@modules/role/docs/role.system.doc';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleService } from '@modules/role/services/role.service';
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.system.role')
@Controller({
    version: '1',
    path: '/role',
})
export class RoleSystemController {
    constructor(private readonly roleService: RoleService) {}

    @RoleSystemListDoc()
    @ResponsePaging('role.list')
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationQuery({
            availableSearch: ROLE_DEFAULT_AVAILABLE_SEARCH,
        })
        pagination: IPaginationQueryReturn,
        @PaginationQueryFilterInEnum<ENUM_POLICY_ROLE_TYPE>(
            'type',
            ROLE_DEFAULT_ROLE_TYPE
        )
        type?: Record<string, IDatabaseFilterOperation>
    ): Promise<IResponsePagingReturn<RoleListResponseDto>> {
        const results: IResponsePagingReturn<RoleListResponseDto> =
            await this.roleService.getList(pagination, type);

        return results;
    }
}
