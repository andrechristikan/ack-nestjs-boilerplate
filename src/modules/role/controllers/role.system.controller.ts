// TODO: RESOLVE THIS
// import { Controller, Get } from '@nestjs/common';
// import { ApiTags } from '@nestjs/swagger';
// import { ApiKeySystemProtected } from '@modules/api-key/decorators/api-key.decorator';
// import {
//     PaginationQuery,
//     PaginationQueryFilterInEnum,
// } from '@common/pagination/decorators/pagination.decorator';
// import { PaginationListDto } from '@common/pagination/dtos/pagination.list.dto';
// import { PaginationService } from '@common/pagination/services/pagination.service';
// import { ENUM_POLICY_ROLE_TYPE } from '@modules/policy/enums/policy.enum';
// import { ResponsePaging } from '@common/response/decorators/response.decorator';
// import { IResponsePaging } from '@common/response/interfaces/response.interface';
// import {
//     ROLE_DEFAULT_AVAILABLE_SEARCH,
//     ROLE_DEFAULT_POLICY_ROLE_TYPE,
// } from '@modules/role/constants/role.list.constant';
// import { RoleShortResponseDto } from '@modules/role/dtos/response/role.short.response.dto';
// import { RoleDoc } from '@modules/role/repository/entities/role.entity';
// import { RoleService } from '@modules/role/services/role.service';
// import { RoleSystemListDoc } from '@modules/role/docs/role.system.doc';

// @ApiTags('modules.system.role')
// @Controller({
//     version: '1',
//     path: '/role',
// })
// export class RoleSystemController {
//     constructor(
//         private readonly paginationService: PaginationService,
//         private readonly roleService: RoleService
//     ) {}

//     @RoleSystemListDoc()
//     @ResponsePaging('role.list')
//     @ApiKeySystemProtected()
//     @Get('/list')
//     async list(
//         @PaginationQuery({ availableSearch: ROLE_DEFAULT_AVAILABLE_SEARCH })
//         { _search, _limit, _offset, _order }: PaginationListDto,
//         @PaginationQueryFilterInEnum(
//             'type',
//             ROLE_DEFAULT_POLICY_ROLE_TYPE,
//             ENUM_POLICY_ROLE_TYPE
//         )
//         type: Record<string, any>
//     ): Promise<IResponsePaging<RoleShortResponseDto>> {
//         const find: Record<string, any> = {
//             ..._search,
//             ...type,
//         };

//         const roles: RoleDoc[] = await this.roleService.findAll(find, {
//             paging: {
//                 limit: _limit,
//                 offset: _offset,
//             },
//             order: _order,
//         });

//         const total: number = await this.roleService.getTotal(find);
//         const totalPage: number = this.paginationService.totalPage(
//             total,
//             _limit
//         );
//         const mapRoles: RoleShortResponseDto[] =
//             this.roleService.mapShort(roles);

//         return {
//             _pagination: { total, totalPage },
//             data: mapRoles,
//         };
//     }
// }
