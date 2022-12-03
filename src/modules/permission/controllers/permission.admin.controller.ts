import {
    Body,
    Controller,
    Get,
    InternalServerErrorException,
    Patch,
    Put,
    Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ENUM_AUTH_PERMISSIONS } from 'src/common/auth/constants/auth.enum.permission.constant';
import { AuthJwtAdminAccessProtected } from 'src/common/auth/decorators/auth.jwt.decorator';
import { AuthPermissionProtected } from 'src/common/auth/decorators/auth.permission.decorator';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import { ENUM_PAGINATION_SORT_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { RequestParamGuard } from 'src/common/request/decorators/request.decorator';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from 'src/common/response/interfaces/response.interface';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';
import {
    PermissionGetGuard,
    PermissionUpdateActiveGuard,
    PermissionUpdateGuard,
    PermissionUpdateInactiveGuard,
} from 'src/modules/permission/decorators/permission.admin.decorator';
import { GetPermission } from 'src/modules/permission/decorators/permission.decorator';
import {
    PermissionActiveDoc,
    PermissionGetDoc,
    PermissionGroupDoc,
    PermissionInactiveDoc,
    PermissionListDoc,
    PermissionUpdateDoc,
} from 'src/modules/permission/docs/permission.admin.doc';
import { PermissionGroupDto } from 'src/modules/permission/dtos/permission.group.dto';
import { PermissionListDto } from 'src/modules/permission/dtos/permission.list.dto';
import { PermissionUpdateDto } from 'src/modules/permission/dtos/permission.update.dto';
import { PermissionRequestDto } from 'src/modules/permission/dtos/permissions.request.dto';
import { IPermissionGroup } from 'src/modules/permission/interfaces/permission.interface';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';
import { PermissionGetSerialization } from 'src/modules/permission/serializations/permission.get.serialization';
import { PermissionGroupsSerialization } from 'src/modules/permission/serializations/permission.group.serialization';
import { PermissionListSerialization } from 'src/modules/permission/serializations/permission.list.serialization';
import { PermissionService } from 'src/modules/permission/services/permission.service';

@ApiTags('modules.admin.permission')
@Controller({
    version: '1',
    path: '/permission',
})
export class PermissionAdminController {
    constructor(
        private readonly paginationService: PaginationService,
        private readonly permissionService: PermissionService
    ) {}

    @PermissionListDoc()
    @ResponsePaging('permission.list', {
        serialization: PermissionListSerialization,
    })
    @AuthPermissionProtected(ENUM_AUTH_PERMISSIONS.PERMISSION_READ)
    @AuthJwtAdminAccessProtected()
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
            group,
        }: PermissionListDto
    ): Promise<IResponsePaging> {
        const skip: number = await this.paginationService.skip(page, perPage);
        const find: Record<string, any> = {
            ...isActive,
            ...search,
            ...group,
        };

        const permissions: PermissionEntity[] =
            await this.permissionService.findAll(find, {
                paging: {
                    limit: perPage,
                    skip: skip,
                },
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

    @PermissionGroupDoc()
    @Response('permission.group', {
        serialization: PermissionGroupsSerialization,
    })
    @AuthPermissionProtected(ENUM_AUTH_PERMISSIONS.PERMISSION_READ)
    @AuthJwtAdminAccessProtected()
    @Get('/group')
    async group(
        @Query()
        { group }: PermissionGroupDto
    ): Promise<IResponse> {
        const find: Record<string, any> = {
            ...group,
        };

        const permissions: PermissionEntity[] =
            await this.permissionService.findAll(find, {
                sort: { group: ENUM_PAGINATION_SORT_TYPE.ASC },
            });

        const groups: IPermissionGroup[] = await this.permissionService.groups(
            permissions
        );

        return { groups };
    }

    @PermissionGetDoc()
    @Response('permission.get', {
        serialization: PermissionGetSerialization,
    })
    @PermissionGetGuard()
    @RequestParamGuard(PermissionRequestDto)
    @AuthPermissionProtected(ENUM_AUTH_PERMISSIONS.PERMISSION_READ)
    @AuthJwtAdminAccessProtected()
    @Get('/get/:permission')
    async get(
        @GetPermission() permission: PermissionEntity
    ): Promise<IResponse> {
        return permission;
    }

    @PermissionUpdateDoc()
    @Response('permission.update', {
        serialization: ResponseIdSerialization,
    })
    @PermissionUpdateGuard()
    @RequestParamGuard(PermissionRequestDto)
    @AuthPermissionProtected(
        ENUM_AUTH_PERMISSIONS.PERMISSION_READ,
        ENUM_AUTH_PERMISSIONS.PERMISSION_UPDATE
    )
    @AuthJwtAdminAccessProtected()
    @Put('/update/:permission')
    async update(
        @GetPermission() permission: PermissionEntity,
        @Body() body: PermissionUpdateDto
    ): Promise<IResponse> {
        try {
            await this.permissionService.update(permission._id, body);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                error: err.message,
            });
        }

        return {
            _id: permission._id,
        };
    }

    @PermissionInactiveDoc()
    @Response('permission.inactive')
    @PermissionUpdateInactiveGuard()
    @RequestParamGuard(PermissionRequestDto)
    @AuthPermissionProtected(
        ENUM_AUTH_PERMISSIONS.PERMISSION_READ,
        ENUM_AUTH_PERMISSIONS.PERMISSION_UPDATE,
        ENUM_AUTH_PERMISSIONS.PERMISSION_INACTIVE
    )
    @AuthJwtAdminAccessProtected()
    @Patch('/update/:permission/inactive')
    async inactive(
        @GetPermission() permission: PermissionEntity
    ): Promise<void> {
        try {
            await this.permissionService.inactive(permission._id);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                error: err.message,
            });
        }

        return;
    }

    @PermissionActiveDoc()
    @Response('permission.active', {})
    @PermissionUpdateActiveGuard()
    @RequestParamGuard(PermissionRequestDto)
    @AuthPermissionProtected(
        ENUM_AUTH_PERMISSIONS.PERMISSION_READ,
        ENUM_AUTH_PERMISSIONS.PERMISSION_UPDATE,
        ENUM_AUTH_PERMISSIONS.PERMISSION_ACTIVE
    )
    @AuthJwtAdminAccessProtected()
    @Patch('/update/:permission/active')
    async active(@GetPermission() permission: PermissionEntity): Promise<void> {
        try {
            await this.permissionService.active(permission._id);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                error: err.message,
            });
        }

        return;
    }
}
