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
import { AuthApiKey } from 'src/common/auth/decorators/auth.api-key.decorator';
import { AuthAdminJwtGuard } from 'src/common/auth/decorators/auth.jwt.decorator';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import {
    RequestParamGuard,
    RequestValidateTimestamp,
    RequestValidateUserAgent,
} from 'src/common/request/decorators/request.decorator';
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
    PermissionInactiveDoc,
    PermissionListDoc,
    PermissionUpdateDoc,
} from 'src/modules/permission/docs/permission.admin.doc';
import { PermissionListDto } from 'src/modules/permission/dtos/permission.list.dto';
import { PermissionUpdateDto } from 'src/modules/permission/dtos/permission.update.dto';
import { PermissionRequestDto } from 'src/modules/permission/dtos/permissions.request.dto';
import { PermissionDocument } from 'src/modules/permission/schemas/permission.schema';
import { PermissionGetSerialization } from 'src/modules/permission/serializations/permission.get.serialization';
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
        classSerialization: PermissionListSerialization,
    })
    @AuthAdminJwtGuard(ENUM_AUTH_PERMISSIONS.PERMISSION_READ)
    @AuthApiKey()
    @RequestValidateUserAgent()
    @RequestValidateTimestamp()
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
        const find: Record<string, any> = {
            isActive: {
                $in: isActive,
            },
            ...search,
        };

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

    @PermissionGetDoc()
    @Response('permission.get', {
        classSerialization: PermissionGetSerialization,
    })
    @PermissionGetGuard()
    @RequestParamGuard(PermissionRequestDto)
    @AuthAdminJwtGuard(ENUM_AUTH_PERMISSIONS.PERMISSION_READ)
    @AuthApiKey()
    @RequestValidateUserAgent()
    @RequestValidateTimestamp()
    @Get('/get/:permission')
    async get(
        @GetPermission() permission: PermissionDocument
    ): Promise<IResponse> {
        return permission;
    }

    @PermissionUpdateDoc()
    @Response('permission.update', {
        classSerialization: ResponseIdSerialization,
    })
    @PermissionUpdateGuard()
    @RequestParamGuard(PermissionRequestDto)
    @AuthAdminJwtGuard(
        ENUM_AUTH_PERMISSIONS.PERMISSION_READ,
        ENUM_AUTH_PERMISSIONS.PERMISSION_UPDATE
    )
    @AuthApiKey()
    @RequestValidateUserAgent()
    @RequestValidateTimestamp()
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
                error: err.message,
            });
        }

        return {
            _id: permission._id,
        };
    }

    @PermissionInactiveDoc()
    @Response('permission.inactive', {})
    @PermissionUpdateInactiveGuard()
    @RequestParamGuard(PermissionRequestDto)
    @AuthAdminJwtGuard(
        ENUM_AUTH_PERMISSIONS.PERMISSION_READ,
        ENUM_AUTH_PERMISSIONS.PERMISSION_UPDATE
    )
    @AuthApiKey()
    @RequestValidateUserAgent()
    @RequestValidateTimestamp()
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
                error: err.message,
            });
        }

        return;
    }

    @PermissionActiveDoc()
    @Response('permission.active', {})
    @PermissionUpdateActiveGuard()
    @RequestParamGuard(PermissionRequestDto)
    @AuthAdminJwtGuard(
        ENUM_AUTH_PERMISSIONS.PERMISSION_READ,
        ENUM_AUTH_PERMISSIONS.PERMISSION_UPDATE
    )
    @AuthApiKey()
    @RequestValidateUserAgent()
    @RequestValidateTimestamp()
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
                error: err.message,
            });
        }

        return;
    }
}
