import { Controller, Get, Query } from '@nestjs/common';
import { AuthJwtGuard } from 'src/auth/auth.decorator';
import { ENUM_PERMISSIONS } from 'src/permission/permission.constant';
import { PaginationService } from 'src/pagination/pagination.service';
import { PermissionService } from './permission.service';
import { PermissionDocument } from './permission.interface';
import { Response } from 'src/response/response.decorator';
import { IResponsePaging } from 'src/response/response.interface';
import { PermissionListValidation } from './validation/permission.list.validation';
import { RequestValidationPipe } from 'src/request/pipe/request.validation.pipe';

@Controller('/permission')
export class PermissionController {
    constructor(
        private readonly paginationService: PaginationService,
        private readonly permissionService: PermissionService
    ) {}

    @Response('permission.findAll')
    @AuthJwtGuard(ENUM_PERMISSIONS.PERMISSION_READ)
    @Get('/list')
    async findAll(
        @Query(RequestValidationPipe)
        { page, perPage, sort, search }: PermissionListValidation
    ): Promise<IResponsePaging> {
        const skip: number = await this.paginationService.skip(page, perPage);
        const find: Record<string, any> = {};
        if (search) {
            find['$or'] = [
                {
                    name: {
                        $regex: new RegExp(search),
                        $options: 'i'
                    }
                }
            ];
        }

        const permissions: PermissionDocument[] = await this.permissionService.findAll(
            find,
            {
                skip: skip,
                limit: perPage,
                sort
            }
        );

        const totalData: number = await this.permissionService.getTotalData(
            find
        );
        const totalPage: number = await this.paginationService.totalPage(
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
