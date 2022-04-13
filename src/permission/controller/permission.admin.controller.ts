import {
    Body,
    Controller,
    Get,
    InternalServerErrorException,
    Patch,
    Put,
    Query,
} from '@nestjs/common';
import { ENUM_PERMISSIONS } from 'src/permission/permission.constant';
import { AuthAdminJwtGuard } from 'src/auth/auth.decorator';
import { DebuggerService } from 'src/debugger/service/debugger.service';
import { PermissionService } from '../service/permission.service';
import { PermissionListValidation } from '../validation/permission.list.validation';
import { PermissionListTransformer } from '../transformer/permission.list.transformer';
import {
    GetPermission,
    PermissionGetGuard,
    PermissionUpdateActiveGuard,
    PermissionUpdateGuard,
    PermissionUpdateInactiveGuard,
} from '../permission.decorator';
import { PermissionUpdateValidation } from '../validation/permission.update.validation';
import { RequestValidationPipe } from 'src/utils/request/pipe/request.validation.pipe';
import {
    Response,
    ResponsePaging,
} from 'src/utils/response/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from 'src/utils/response/response.interface';
import { ENUM_STATUS_CODE_ERROR } from 'src/utils/error/error.constant';
import { PaginationService } from 'src/utils/pagination/service/pagination.service';
import { PermissionDocument } from '../schema/permission.schema';

@Controller({
    version: '1',
    path: 'permission',
})
export class PermissionAdminController {
    constructor(
        private readonly debuggerService: DebuggerService,
        private readonly paginationService: PaginationService,
        private readonly permissionService: PermissionService
    ) {}

    @ResponsePaging('permission.list')
    @AuthAdminJwtGuard(ENUM_PERMISSIONS.PERMISSION_READ)
    @Get('/list')
    async list(
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
                        $options: 'i',
                    },
                },
            ];
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

        const data: PermissionListTransformer[] =
            await this.permissionService.mapList(permissions);

        return {
            totalData,
            totalPage,
            currentPage: page,
            perPage,
            data,
        };
    }

    @Response('permission.get')
    @PermissionGetGuard()
    @AuthAdminJwtGuard(ENUM_PERMISSIONS.PERMISSION_READ)
    @Get('/get/:permission')
    async get(
        @GetPermission() permission: PermissionDocument
    ): Promise<IResponse> {
        return this.permissionService.mapGet(permission);
    }

    @Response('permission.update')
    @PermissionUpdateGuard()
    @AuthAdminJwtGuard(
        ENUM_PERMISSIONS.PERMISSION_READ,
        ENUM_PERMISSIONS.PERMISSION_UPDATE
    )
    @Put('/update/:permission')
    async update(
        @GetPermission() permission: PermissionDocument,
        @Body(RequestValidationPipe) body: PermissionUpdateValidation
    ): Promise<IResponse> {
        try {
            await this.permissionService.update(permission._id, body);
        } catch (e) {
            this.debuggerService.error(
                'Auth active server internal error',
                'AuthAdminController',
                'updateActive',
                e
            );

            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError',
            });
        }

        return {
            _id: permission._id,
        };
    }

    @Response('permission.inactive')
    @PermissionUpdateInactiveGuard()
    @AuthAdminJwtGuard(
        ENUM_PERMISSIONS.PERMISSION_READ,
        ENUM_PERMISSIONS.PERMISSION_UPDATE
    )
    @Patch('/update/:permission/inactive')
    async inactive(
        @GetPermission() permission: PermissionDocument
    ): Promise<void> {
        try {
            await this.permissionService.inactive(permission._id);
        } catch (e) {
            this.debuggerService.error(
                'Permission inactive server internal error',

                'PermissionController',
                'inactive',
                e
            );

            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError',
            });
        }

        return;
    }

    @Response('permission.active')
    @PermissionUpdateActiveGuard()
    @AuthAdminJwtGuard(
        ENUM_PERMISSIONS.PERMISSION_READ,
        ENUM_PERMISSIONS.PERMISSION_UPDATE
    )
    @Patch('/update/:permission/active')
    async active(
        @GetPermission() permission: PermissionDocument
    ): Promise<void> {
        try {
            await this.permissionService.active(permission._id);
        } catch (e) {
            this.debuggerService.error(
                'Permission active server internal error',
                'PermissionController',
                'active',
                e
            );

            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError',
            });
        }

        return;
    }
}
