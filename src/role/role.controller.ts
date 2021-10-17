import {
    Controller,
    Get,
    DefaultValuePipe,
    ParseIntPipe,
    Query
} from '@nestjs/common';
import { AuthJwtGuard } from 'src/auth/auth.decorator';
import { ENUM_PERMISSIONS } from 'src/permission/permission.constant';
import { RoleService } from './role.service';
import { PaginationService } from 'src/pagination/pagination.service';
import { RoleDocument } from './role.interface';
import {
    DEFAULT_PAGE,
    DEFAULT_PER_PAGE
} from 'src/pagination/pagination.constant';
import { Response } from 'src/response/response.decorator';
import { IResponsePaging } from 'src/response/response.interface';

@Controller('/role')
export class RoleController {
    constructor(
        private readonly paginationService: PaginationService,
        private readonly roleService: RoleService
    ) {}

    @Get('/')
    @AuthJwtGuard(ENUM_PERMISSIONS.ROLE_READ)
    @Response('role.findAll')
    async findAll(
        @Query('page', new DefaultValuePipe(DEFAULT_PAGE), ParseIntPipe)
        page: number,
        @Query('perPage', new DefaultValuePipe(DEFAULT_PER_PAGE), ParseIntPipe)
        perPage: number
    ): Promise<IResponsePaging> {
        const skip = await this.paginationService.skip(page, perPage);
        const roles: RoleDocument[] = await this.roleService.findAll<RoleDocument>(
            {},
            {
                skip: skip,
                limit: perPage
            }
        );

        const totalData: number = await this.roleService.getTotalData();
        const totalPage = await this.paginationService.totalPage(
            totalData,
            perPage
        );

        return {
            totalData,
            totalPage,
            currentPage: page,
            perPage,
            data: roles
        };
    }
}
