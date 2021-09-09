import {
    Controller,
    Get,
    DefaultValuePipe,
    ParseIntPipe,
    Query
} from '@nestjs/common';
import { Response } from 'src/response/response.decorator';
import { AuthJwtGuard } from 'src/auth/auth.decorator';
import { ENUM_PERMISSIONS } from 'src/permission/permission.constant';
import { Permissions } from 'src/permission/permission.decorator';
import { PaginationService } from 'src/pagination/pagination.service';
import {
    DEFAULT_PAGE,
    DEFAULT_PER_PAGE
} from 'src/pagination/pagination.constant';
import { IResponsePaging } from 'src/response/response.interface';
import { PermissionService } from './permission.service';
import { PermissionDocument } from './permission.interface';

@Controller('/permission')
export class PermissionController {
    constructor(
        private readonly paginationService: PaginationService,
        private readonly permissionService: PermissionService
    ) {}

    @Get('/')
    @AuthJwtGuard()
    @Response('permission.findAll')
    @Permissions(ENUM_PERMISSIONS.PERMISSION_READ)
    async findAll(
        @Query('page', new DefaultValuePipe(DEFAULT_PAGE), ParseIntPipe)
        page: number,
        @Query('perPage', new DefaultValuePipe(DEFAULT_PER_PAGE), ParseIntPipe)
        perPage: number
    ): Promise<IResponsePaging> {
        const skip = await this.paginationService.skip(page, perPage);
        const permissions: PermissionDocument[] = await this.permissionService.findAll(
            {},
            {
                skip: skip,
                limit: perPage
            }
        );

        const totalData: number = await this.permissionService.getTotalData();
        const totalPage = await this.paginationService.totalPage(
            totalData,
            perPage
        );

        return {
            totalData,
            totalPage,
            currentPage: page,
            perPage,
            data: permissions
        };
    }
}
