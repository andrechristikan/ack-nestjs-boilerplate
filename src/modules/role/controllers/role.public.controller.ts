import {
    PaginationOffsetQuery,
    PaginationQueryFilterInEnum,
} from '@common/pagination/decorators/pagination.decorator';
import {
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { RequestIsValidObjectIdPipe } from '@common/request/pipes/request.is-valid-object-id.pipe';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    ROLE_DEFAULT_AVAILABLE_SEARCH,
    ROLE_DEFAULT_ROLE_TYPE,
} from '@modules/role/constants/role.list.constant';
import {
    RolePublicGetDoc,
    RolePublicListDoc,
} from '@modules/role/docs/role.public.doc';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleDto } from '@modules/role/dtos/role.dto';
import { RoleService } from '@modules/role/services/role.service';
import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EnumRoleType } from '@prisma/client';

@ApiTags('modules.public.role')
@Controller({
    version: '1',
    path: '/role',
})
export class RolePublicController {
    constructor(private readonly roleService: RoleService) {}

    @RolePublicListDoc()
    @ResponsePaging('role.list')
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationOffsetQuery({
            availableSearch: ROLE_DEFAULT_AVAILABLE_SEARCH,
        })
        pagination: IPaginationQueryOffsetParams,
        @PaginationQueryFilterInEnum<EnumRoleType>(
            'type',
            ROLE_DEFAULT_ROLE_TYPE
        )
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<RoleListResponseDto>> {
        return this.roleService.getList(pagination, type);
    }

    @RolePublicGetDoc()
    @Response('role.get')
    @ApiKeyProtected()
    @Get('/get/:roleId')
    async get(
        @Param('roleId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        roleId: string
    ): Promise<IResponseReturn<RoleDto>> {
        return this.roleService.getOne(roleId);
    }
}
