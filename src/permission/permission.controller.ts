import {
    Body,
    Controller,
    Get,
    InternalServerErrorException,
    Patch,
    Put,
    Query
} from '@nestjs/common';
import { ENUM_PERMISSIONS } from 'src/permission/permission.constant';
import { PaginationService } from 'src/pagination/pagination.service';
import { PermissionService } from './permission.service';
import { PermissionDocument } from './permission.interface';
import { Response, ResponsePaging } from 'src/response/response.decorator';
import { IResponse, IResponsePaging } from 'src/response/response.interface';
import { PermissionListValidation } from './validation/permission.list.validation';
import { RequestValidationPipe } from 'src/request/pipe/request.validation.pipe';
import {
    GetPermission,
    PermissionGetGuard,
    PermissionUpdateActiveGuard,
    PermissionUpdateGuard,
    PermissionUpdateInactiveGuard
} from './permission.decorator';
import { PermissionUpdateValidation } from './validation/permission.update.validation';
import { ENUM_STATUS_CODE_ERROR } from 'src/error/error.constant';
import { Logger as DebuggerService } from 'winston';
import { Debugger } from 'src/debugger/debugger.decorator';
import { AuthAdminJwtGuard } from 'src/auth/auth.decorator';

@Controller('/permission')
export class PermissionAdminController {
    constructor(
        @Debugger() private readonly debuggerService: DebuggerService,
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
                        $options: 'i'
                    }
                }
            ];
        }

        const permissions: PermissionDocument[] =
            await this.permissionService.findAll(find, {
                skip: skip,
                limit: perPage,
                sort
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
            data: permissions
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
            this.debuggerService.error('Auth active server internal error', {
                class: 'AuthAdminController',
                function: 'updateActive',
                error: { ...e }
            });

            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError'
            });
        }

        return {
            _id: permission._id
        };
    }

    @Response('permission.inactive')
    @PermissionUpdateInactiveGuard()
    @AuthAdminJwtGuard(
        ENUM_PERMISSIONS.PERMISSION_READ,
        ENUM_PERMISSIONS.PERMISSION_UPDATE
    )
    @Patch('/inactive/:permission')
    async inactive(
        @GetPermission() permission: PermissionDocument
    ): Promise<IResponse> {
        try {
            await this.permissionService.inactive(permission._id);
        } catch (e) {
            this.debuggerService.error(
                'Permission inactive server internal error',
                {
                    class: 'PermissionController',
                    function: 'inactive',
                    error: { ...e }
                }
            );

            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError'
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
    @Patch('/active/:permission')
    async active(
        @GetPermission() permission: PermissionDocument
    ): Promise<IResponse> {
        try {
            await this.permissionService.active(permission._id);
        } catch (e) {
            this.debuggerService.error(
                'Permission active server internal error',
                {
                    class: 'PermissionController',
                    function: 'active',
                    error: { ...e }
                }
            );

            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError'
            });
        }

        return;
    }
}
