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
import { ENUM_PERMISSION_STATUS_CODE_ERROR } from 'src/modules/permission/constants/permission.status-code.constant';
import { Permission } from 'src/modules/permission/schemas/permission.schema';
import { PermissionService } from 'src/modules/permission/services/permission.service';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/constants/role.status-code.constant';
import {
    RoleDeleteGuard,
    RoleGetGuard,
    RoleUpdateActiveGuard,
    RoleUpdateGuard,
    RoleUpdateInactiveGuard,
} from 'src/modules/role/decorators/role.admin.decorator';
import { GetRole } from 'src/modules/role/decorators/role.decorator';
import {
    RoleActiveDoc,
    RoleCreateDoc,
    RoleDeleteDoc,
    RoleGetDoc,
    RoleInactiveDoc,
    RoleListDoc,
    RoleUpdateDoc,
} from 'src/modules/role/docs/role.admin.doc';
import { RoleCreateDto } from 'src/modules/role/dtos/role.create.dto';
import { RoleListDto } from 'src/modules/role/dtos/role.list.dto';
import { RoleRequestDto } from 'src/modules/role/dtos/role.request.dto';
import { RoleUpdateDto } from 'src/modules/role/dtos/role.update.dto';
import { IRole } from 'src/modules/role/interfaces/role.interface';
import { Role } from 'src/modules/role/schemas/role.schema';
import { RoleGetSerialization } from 'src/modules/role/serializations/role.get.serialization';
import { RoleListSerialization } from 'src/modules/role/serializations/role.list.serialization';
import { RoleService } from 'src/modules/role/services/role.service';

@ApiTags('modules.admin.role')
@Controller({
    version: '1',
    path: '/role',
})
export class RoleAdminController {
    constructor(
        private readonly paginationService: PaginationService,
        private readonly roleService: RoleService,
        private readonly permissionService: PermissionService
    ) {}

    @RoleListDoc()
    @ResponsePaging('role.list', {
        classSerialization: RoleListSerialization,
    })
    @AuthAdminJwtGuard(ENUM_AUTH_PERMISSIONS.ROLE_READ)
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
        }: RoleListDto
    ): Promise<IResponsePaging> {
        const skip: number = await this.paginationService.skip(page, perPage);
        const find: Record<string, any> = {
            ...search,
        };

        const roles: Role[] = await this.roleService.findAll(find, {
            skip: skip,
            limit: perPage,
            sort,
        });

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
            availableSearch,
            availableSort,
            data: roles,
        };
    }

    @RoleGetDoc()
    @Response('role.get', {
        classSerialization: RoleGetSerialization,
    })
    @RoleGetGuard()
    @RequestParamGuard(RoleRequestDto)
    @AuthAdminJwtGuard(ENUM_AUTH_PERMISSIONS.ROLE_READ)
    @AuthApiKey()
    @RequestValidateUserAgent()
    @RequestValidateTimestamp()
    @Get('get/:role')
    async get(@GetRole() role: IRole): Promise<IResponse> {
        return role;
    }

    @RoleCreateDoc()
    @Response('role.create', {
        classSerialization: ResponseIdSerialization,
    })
    @AuthAdminJwtGuard(
        ENUM_AUTH_PERMISSIONS.ROLE_READ,
        ENUM_AUTH_PERMISSIONS.ROLE_CREATE
    )
    @AuthApiKey()
    @RequestValidateUserAgent()
    @RequestValidateTimestamp()
    @Post('/create')
    async create(
        @Body()
        { name, permissions, accessFor }: RoleCreateDto
    ): Promise<IResponse> {
        const exist: boolean = await this.roleService.exists(name);
        if (exist) {
            throw new BadRequestException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_EXIST_ERROR,
                message: 'role.error.exist',
            });
        }

        for (const permission of permissions) {
            const checkPermission: Permission =
                await this.permissionService.findOneById(permission);

            if (!checkPermission) {
                throw new NotFoundException({
                    statusCode:
                        ENUM_PERMISSION_STATUS_CODE_ERROR.PERMISSION_NOT_FOUND_ERROR,
                    message: 'permission.error.notFound',
                });
            }
        }

        try {
            const create = await this.roleService.create({
                name,
                permissions,
                accessFor,
            });

            return {
                _id: create._id,
            };
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                error: err.message,
            });
        }
    }

    @RoleUpdateDoc()
    @Response('role.update', {
        classSerialization: ResponseIdSerialization,
    })
    @RoleUpdateGuard()
    @RequestParamGuard(RoleRequestDto)
    @AuthAdminJwtGuard(
        ENUM_AUTH_PERMISSIONS.ROLE_READ,
        ENUM_AUTH_PERMISSIONS.ROLE_UPDATE
    )
    @AuthApiKey()
    @RequestValidateUserAgent()
    @RequestValidateTimestamp()
    @Put('/update/:role')
    async update(
        @GetRole() role: Role,
        @Body()
        { name, permissions, accessFor }: RoleUpdateDto
    ): Promise<IResponse> {
        const check: boolean = await this.roleService.exists(name, role._id);
        if (check) {
            throw new BadRequestException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_EXIST_ERROR,
                message: 'role.error.exist',
            });
        }

        for (const permission of permissions) {
            const checkPermission: Permission =
                await this.permissionService.findOneById(permission);

            if (!checkPermission) {
                throw new NotFoundException({
                    statusCode:
                        ENUM_PERMISSION_STATUS_CODE_ERROR.PERMISSION_NOT_FOUND_ERROR,
                    message: 'permission.error.notFound',
                });
            }
        }

        try {
            await this.roleService.update(role._id, {
                name,
                permissions,
                accessFor,
            });
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                error: err.message,
            });
        }

        return {
            _id: role._id,
        };
    }

    @RoleDeleteDoc()
    @Response('role.delete')
    @RoleDeleteGuard()
    @RequestParamGuard(RoleRequestDto)
    @AuthAdminJwtGuard(
        ENUM_AUTH_PERMISSIONS.ROLE_READ,
        ENUM_AUTH_PERMISSIONS.ROLE_DELETE
    )
    @AuthApiKey()
    @RequestValidateUserAgent()
    @RequestValidateTimestamp()
    @Delete('/delete/:role')
    async delete(@GetRole() role: IRole): Promise<void> {
        try {
            await this.roleService.deleteOneById(role._id);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                error: err.message,
            });
        }
        return;
    }

    @RoleInactiveDoc()
    @Response('role.inactive')
    @RoleUpdateInactiveGuard()
    @RequestParamGuard(RoleRequestDto)
    @AuthAdminJwtGuard(
        ENUM_AUTH_PERMISSIONS.ROLE_READ,
        ENUM_AUTH_PERMISSIONS.ROLE_UPDATE
    )
    @AuthApiKey()
    @RequestValidateUserAgent()
    @RequestValidateTimestamp()
    @Patch('/update/:role/inactive')
    async inactive(@GetRole() role: IRole): Promise<void> {
        try {
            await this.roleService.inactive(role._id);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                error: err.message,
            });
        }

        return;
    }

    @RoleActiveDoc()
    @Response('role.active')
    @RoleUpdateActiveGuard()
    @RequestParamGuard(RoleRequestDto)
    @AuthAdminJwtGuard(
        ENUM_AUTH_PERMISSIONS.ROLE_READ,
        ENUM_AUTH_PERMISSIONS.ROLE_UPDATE
    )
    @AuthApiKey()
    @RequestValidateUserAgent()
    @RequestValidateTimestamp()
    @Patch('/update/:role/active')
    async active(@GetRole() role: IRole): Promise<void> {
        try {
            await this.roleService.active(role._id);
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
