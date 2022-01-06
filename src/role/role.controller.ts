import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    InternalServerErrorException,
    NotFoundException,
    Patch,
    Post,
    Put,
    Query
} from '@nestjs/common';
import {
    ENUM_PERMISSIONS,
    ENUM_PERMISSION_STATUS_CODE_ERROR
} from 'src/permission/permission.constant';
import { RoleService } from './role.service';
import { PaginationService } from 'src/pagination/pagination.service';
import { IRoleDocument, RoleDocument } from './role.interface';
import { Response, ResponsePaging } from 'src/response/response.decorator';
import { IResponse, IResponsePaging } from 'src/response/response.interface';
import { RoleListValidation } from './validation/role.list.validation';
import { ENUM_ROLE_STATUS_CODE_ERROR } from './role.constant';
import { ENUM_STATUS_CODE_ERROR } from 'src/error/error.constant';
import { Logger as DebuggerService } from 'winston';
import { Debugger } from 'src/debugger/debugger.decorator';
import { RoleCreateValidation } from './validation/role.create.validation';
import { RequestValidationPipe } from 'src/request/pipe/request.validation.pipe';
import {
    GetRole,
    RoleGetGuard,
    RoleUpdateActiveGuard,
    RoleUpdateGuard,
    RoleUpdateInactiveGuard
} from './role.decorator';
import { RoleListTransformer } from './transformer/role.list.transformer';
import { Types } from 'mongoose';
import { PermissionDocument } from 'src/permission/permission.interface';
import { PermissionService } from 'src/permission/permission.service';
import { RoleUpdateValidation } from './validation/role.update.validation';
import { AuthAdminJwtGuard } from 'src/auth/auth.decorator';

@Controller('/role')
export class RoleAdminController {
    constructor(
        @Debugger() private readonly debuggerService: DebuggerService,
        private readonly paginationService: PaginationService,
        private readonly roleService: RoleService,
        private readonly permissionService: PermissionService
    ) {}

    @ResponsePaging('role.list')
    @AuthAdminJwtGuard(ENUM_PERMISSIONS.ROLE_READ)
    @Get('/list')
    async list(
        @Query(RequestValidationPipe)
        { page, perPage, sort, search }: RoleListValidation
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

        const roles: RoleDocument[] = await this.roleService.findAll(find, {
            skip: skip,
            limit: perPage,
            sort
        });

        const data: RoleListTransformer[] = await this.roleService.mapList(
            roles
        );

        const totalData: number = await this.roleService.getTotal({});
        const totalPage: number = await this.paginationService.totalPage(
            totalData,
            perPage
        );

        return {
            totalData,
            totalPage,
            currentPage: page,
            perPage,
            data
        };
    }

    @Response('role.get')
    @RoleGetGuard()
    @AuthAdminJwtGuard(ENUM_PERMISSIONS.USER_READ)
    @Get('get/:role')
    async get(@GetRole() role: IRoleDocument): Promise<IResponse> {
        return this.roleService.mapGet(role);
    }

    @Response('role.create')
    @AuthAdminJwtGuard(ENUM_PERMISSIONS.ROLE_READ, ENUM_PERMISSIONS.ROLE_DELETE)
    @Post('/create')
    async create(
        @Body(RequestValidationPipe)
        { name, permissions, isAdmin }: RoleCreateValidation
    ): Promise<IResponse> {
        const exist: RoleDocument = await this.roleService.findOne({
            name
        });
        if (exist) {
            this.debuggerService.error('Role Error', {
                class: 'RoleController',
                function: 'delete'
            });

            throw new BadRequestException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_EXIST_ERROR,
                message: 'role.error.exist'
            });
        }

        try {
            const create = await this.roleService.create({
                name,
                permissions,
                isAdmin
            });

            return {
                _id: create._id
            };
        } catch (err: any) {
            this.debuggerService.error('create try catch', {
                class: 'RoleController',
                function: 'create',
                error: err
            });

            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.server.internalServerError'
            });
        }
    }

    @Response('role.update')
    @RoleUpdateGuard()
    @AuthAdminJwtGuard(ENUM_PERMISSIONS.ROLE_READ, ENUM_PERMISSIONS.ROLE_UPDATE)
    @Put('/update/:role')
    async update(
        @GetRole() role: RoleDocument,
        @Body(RequestValidationPipe)
        { name, permissions, isAdmin }: RoleUpdateValidation
    ): Promise<IResponse> {
        const check: RoleDocument = await this.roleService.findOne({
            name: name.toLowerCase(),
            _id: { $nin: [new Types.ObjectId(role._id)] }
        });
        if (check) {
            this.debuggerService.error('Role Exist Error', {
                class: 'RoleController',
                function: 'create'
            });

            throw new BadRequestException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_EXIST_ERROR,
                message: 'role.error.exist'
            });
        }

        for (const permission of permissions) {
            const checkPermission: PermissionDocument =
                await this.permissionService.findOneById(permission);

            if (!checkPermission) {
                this.debuggerService.error('Permission not found', {
                    class: 'RoleController',
                    function: 'update'
                });

                throw new NotFoundException({
                    statusCode:
                        ENUM_PERMISSION_STATUS_CODE_ERROR.PERMISSION_NOT_FOUND_ERROR,
                    message: 'permission.error.notFound'
                });
            }
        }

        try {
            await this.roleService.update(role._id, {
                name,
                permissions,
                isAdmin
            });
        } catch (e) {
            this.debuggerService.error('Project server internal error', {
                class: 'SurveyAdminController',
                function: 'update',
                error: { ...e }
            });

            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError'
            });
        }

        return this.roleService.mapGet(
            await this.roleService.findOneById(role._id, {
                populate: { permission: true }
            })
        );
    }

    @Response('role.delete')
    @RoleGetGuard()
    @AuthAdminJwtGuard(ENUM_PERMISSIONS.ROLE_READ, ENUM_PERMISSIONS.ROLE_DELETE)
    @Delete('/delete/:role')
    async delete(@GetRole() role: IRoleDocument): Promise<void> {
        try {
            await this.roleService.deleteOneById(role._id);
            return;
        } catch (err) {
            this.debuggerService.error('delete try catch', {
                class: 'RoleController',
                function: 'delete',
                error: err
            });
            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.server.internalServerError'
            });
        }
    }

    @Response('role.inactive')
    @RoleUpdateInactiveGuard()
    @AuthAdminJwtGuard(ENUM_PERMISSIONS.ROLE_READ, ENUM_PERMISSIONS.ROLE_UPDATE)
    @Patch('/inactive/:role')
    async inactive(@GetRole() role: IRoleDocument): Promise<IResponse> {
        try {
            await this.roleService.inactive(role._id);
        } catch (e) {
            this.debuggerService.error('Role inactive server internal error', {
                class: 'RoleController',
                function: 'inactive',
                error: { ...e }
            });

            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError'
            });
        }

        return;
    }

    @Response('role.active')
    @RoleUpdateActiveGuard()
    @AuthAdminJwtGuard(ENUM_PERMISSIONS.ROLE_READ, ENUM_PERMISSIONS.ROLE_UPDATE)
    @Patch('/active/:role')
    async active(@GetRole() role: IRoleDocument): Promise<IResponse> {
        try {
            await this.roleService.active(role._id);
        } catch (e) {
            this.debuggerService.error('Role active server internal error', {
                class: 'RoleController',
                function: 'active',
                error: { ...e }
            });

            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError'
            });
        }

        return;
    }
}
