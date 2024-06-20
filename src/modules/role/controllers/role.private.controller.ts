import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeyPrivateProtected } from 'src/common/api-key/decorators/api-key.decorator';
import {
    PaginationQuery,
    PaginationQueryFilterInEnum,
} from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { ENUM_POLICY_ROLE_TYPE } from 'src/common/policy/constants/policy.enum.constant';
import { ResponsePaging } from 'src/common/response/decorators/response.decorator';
import { IResponsePaging } from 'src/common/response/interfaces/response.interface';
import {
    ROLE_DEFAULT_AVAILABLE_SEARCH,
    ROLE_DEFAULT_POLICY_ROLE_TYPE,
} from 'src/modules/role/constants/role.list.constant';
import { RolePrivateListDoc } from 'src/modules/role/docs/role.private.controller';
import { RoleShortResponseDto } from 'src/modules/role/dtos/response/role.short.response.dto';
import { RoleDoc } from 'src/modules/role/repository/entities/role.entity';
import { RoleService } from 'src/modules/role/services/role.service';

@ApiTags('modules.private.role')
@Controller({
    version: '1',
    path: '/role',
})
export class RolePrivateController {
    constructor(
        private readonly paginationService: PaginationService,
        private readonly roleService: RoleService
    ) {}

    @RolePrivateListDoc()
    @ResponsePaging('role.list')
    @ApiKeyPrivateProtected()
    @Get('/list')
    async list(
        @PaginationQuery({ availableSearch: ROLE_DEFAULT_AVAILABLE_SEARCH })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterInEnum(
            'type',
            ROLE_DEFAULT_POLICY_ROLE_TYPE,
            ENUM_POLICY_ROLE_TYPE
        )
        type: Record<string, any>
    ): Promise<IResponsePaging<RoleShortResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            ...type,
        };

        const roles: RoleDoc[] = await this.roleService.findAll(find, {
            paging: {
                limit: _limit,
                offset: _offset,
            },
            order: _order,
        });

        const total: number = await this.roleService.getTotal(find);
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );
        const mapRoles: RoleShortResponseDto[] =
            await this.roleService.mapShort(roles);

        return {
            _pagination: { total, totalPage },
            data: mapRoles,
        };
    }
}
