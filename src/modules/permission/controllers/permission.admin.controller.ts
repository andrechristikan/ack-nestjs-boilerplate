import {
    Body,
    Controller,
    Get,
    InternalServerErrorException,
    Patch,
    Put,
    Query,
} from '@nestjs/common';
import { AuthAdminJwtGuard } from 'src/common/auth/auth.decorator';
import { ENUM_AUTH_PERMISSIONS } from 'src/common/auth/constants/auth.permission.constant';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { RequestParamGuard } from 'src/common/request/request.decorator';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from 'src/common/response/response.interface';
import { PermissionListDto } from '../dtos/permission.list.dto';
import { PermissionUpdateDto } from '../dtos/permission.update.dto';
import { PermissionRequestDto } from '../dtos/permissions.request.dto';
import {
    GetPermission,
    PermissionGetGuard,
    PermissionUpdateActiveGuard,
    PermissionUpdateGuard,
    PermissionUpdateInactiveGuard,
} from '../permission.decorator';
import { PermissionDocument } from '../schemas/permission.schema';
import { PermissionGetSerialization } from '../serializations/permission.get.serialization';
import { PermissionListSerialization } from '../serializations/permission.list.serialization';
import { PermissionService } from '../services/permission.service';

@Controller({
    version: '1',
    path: '/permission',
})
export class PermissionAdminController {
    constructor(
        private readonly paginationService: PaginationService,
        private readonly permissionService: PermissionService
    ) {}

    @ResponsePaging('permission.list', PermissionListSerialization)
    @AuthAdminJwtGuard(ENUM_AUTH_PERMISSIONS.PERMISSION_READ)
    @Get('/list')
    async list(
        @Query()
        {
            page,
            perPage,
            sort,
            search,
            availableSort,
            availableSearch,
            isActive,
        }: PermissionListDto
    ): Promise<IResponsePaging> {
        const skip: number = await this.paginationService.skip(page, perPage);
        let find: Record<string, any> = {
            isActive: {
                $in: isActive,
            },
        };
        if (search) {
            find = {
                ...find,
                ...search,
            };
        }

        const permissions: PermissionDocument[] =
            await this.permissionService.findAll(find, {
                skip: skip,
                limit: perPage,
                sort,
            });

        const totalData: number = await this.permissionService.getTotal(find);
        const totalPage: number = await this.paginationService.totalPage(
            totalData,
            perPage
        );

        return {
            totalData,
            totalPage,
            currentPage: page,
            perPage,
            availableSearch,
            availableSort,
            data: permissions,
        };
    }

    @Response('permission.get', PermissionGetSerialization)
    @PermissionGetGuard()
    @RequestParamGuard(PermissionRequestDto)
    @AuthAdminJwtGuard(ENUM_AUTH_PERMISSIONS.PERMISSION_READ)
    @Get('/get/:permission')
    async get(
        @GetPermission() permission: PermissionDocument
    ): Promise<IResponse> {
        return permission;
    }

    @Response('permission.update')
    @PermissionUpdateGuard()
    @RequestParamGuard(PermissionRequestDto)
    @AuthAdminJwtGuard(
        ENUM_AUTH_PERMISSIONS.PERMISSION_READ,
        ENUM_AUTH_PERMISSIONS.PERMISSION_UPDATE
    )
    @Put('/update/:permission')
    async update(
        @GetPermission() permission: PermissionDocument,
        @Body() body: PermissionUpdateDto
    ): Promise<IResponse> {
        try {
            await this.permissionService.update(permission._id, body);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                cause: err.message,
            });
        }

        return {
            _id: permission._id,
        };
    }

    @Response('permission.inactive')
    @PermissionUpdateInactiveGuard()
    @RequestParamGuard(PermissionRequestDto)
    @AuthAdminJwtGuard(
        ENUM_AUTH_PERMISSIONS.PERMISSION_READ,
        ENUM_AUTH_PERMISSIONS.PERMISSION_UPDATE
    )
    @Patch('/update/:permission/inactive')
    async inactive(
        @GetPermission() permission: PermissionDocument
    ): Promise<void> {
        try {
            await this.permissionService.inactive(permission._id);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                cause: err.message,
            });
        }

        return;
    }

    @Response('permission.active')
    @PermissionUpdateActiveGuard()
    @RequestParamGuard(PermissionRequestDto)
    @AuthAdminJwtGuard(
        ENUM_AUTH_PERMISSIONS.PERMISSION_READ,
        ENUM_AUTH_PERMISSIONS.PERMISSION_UPDATE
    )
    @Patch('/update/:permission/active')
    async active(
        @GetPermission() permission: PermissionDocument
    ): Promise<void> {
        try {
            await this.permissionService.active(permission._id);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                cause: err.message,
            });
        }

        return;
    }
}
