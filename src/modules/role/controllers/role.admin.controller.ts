import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpStatus,
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
import { PermissionDocument } from 'src/modules/permission/schemas/permission.schema';
import { PermissionService } from 'src/modules/permission/services/permission.service';
import { RoleDocParamsGet } from 'src/modules/role/constants/role.doc.constant';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/constants/role.status-code.constant';
import {
    RoleDeleteGuard,
    RoleGetGuard,
    RoleUpdateActiveGuard,
    RoleUpdateGuard,
    RoleUpdateInactiveGuard,
} from 'src/modules/role/decorators/role.admin.decorator';
import { GetRole } from 'src/modules/role/decorators/role.decorator';
import { RoleCreateDto } from 'src/modules/role/dtos/role.create.dto';
import { RoleListDto } from 'src/modules/role/dtos/role.list.dto';
import { RoleRequestDto } from 'src/modules/role/dtos/role.request.dto';
import { RoleUpdateDto } from 'src/modules/role/dtos/role.update.dto';
import { IRoleDocument } from 'src/modules/role/interfaces/role.interface';
import { RoleDocument } from 'src/modules/role/schemas/role.schema';
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

    @ResponsePaging('role.list', {
        classSerialization: RoleListSerialization,
    })
    @AuthAdminJwtGuard(ENUM_AUTH_PERMISSIONS.ROLE_READ)
    @AuthApiKey()
    @RequestValidateUserAgent()
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

        const roles: RoleDocument[] = await this.roleService.findAll(find, {
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

    @Response('role.get', {
        classSerialization: RoleGetSerialization,
        doc: { params: RoleDocParamsGet },
    })
    @RoleGetGuard()
    @RequestParamGuard(RoleRequestDto)
    @AuthAdminJwtGuard(ENUM_AUTH_PERMISSIONS.ROLE_READ)
    @AuthApiKey()
    @RequestValidateUserAgent()
    @Get('get/:role')
    async get(@GetRole() role: IRoleDocument): Promise<IResponse> {
        return role;
    }

    @Response('role.create', {
        classSerialization: ResponseIdSerialization,
        doc: {
            httpStatus: HttpStatus.CREATED,
        },
    })
    @AuthAdminJwtGuard(
        ENUM_AUTH_PERMISSIONS.ROLE_READ,
        ENUM_AUTH_PERMISSIONS.ROLE_CREATE
    )
    @AuthApiKey()
    @RequestValidateUserAgent()
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
            const checkPermission: PermissionDocument =
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

    @Response('role.update', {
        classSerialization: ResponseIdSerialization,
        doc: { params: RoleDocParamsGet },
    })
    @RoleUpdateGuard()
    @RequestParamGuard(RoleRequestDto)
    @AuthAdminJwtGuard(
        ENUM_AUTH_PERMISSIONS.ROLE_READ,
        ENUM_AUTH_PERMISSIONS.ROLE_UPDATE
    )
    @AuthApiKey()
    @RequestValidateUserAgent()
    @Put('/update/:role')
    async update(
        @GetRole() role: RoleDocument,
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
            const checkPermission: PermissionDocument =
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

    @Response('role.delete', { doc: { params: RoleDocParamsGet } })
    @RoleDeleteGuard()
    @RequestParamGuard(RoleRequestDto)
    @AuthAdminJwtGuard(
        ENUM_AUTH_PERMISSIONS.ROLE_READ,
        ENUM_AUTH_PERMISSIONS.ROLE_DELETE
    )
    @AuthApiKey()
    @RequestValidateUserAgent()
    @Delete('/delete/:role')
    async delete(@GetRole() role: IRoleDocument): Promise<void> {
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

    @Response('role.inactive', { doc: { params: RoleDocParamsGet } })
    @RoleUpdateInactiveGuard()
    @RequestParamGuard(RoleRequestDto)
    @AuthAdminJwtGuard(
        ENUM_AUTH_PERMISSIONS.ROLE_READ,
        ENUM_AUTH_PERMISSIONS.ROLE_UPDATE
    )
    @AuthApiKey()
    @RequestValidateUserAgent()
    @Patch('/update/:role/inactive')
    async inactive(@GetRole() role: IRoleDocument): Promise<void> {
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

    @Response('role.active', { doc: { params: RoleDocParamsGet } })
    @RoleUpdateActiveGuard()
    @RequestParamGuard(RoleRequestDto)
    @AuthAdminJwtGuard(
        ENUM_AUTH_PERMISSIONS.ROLE_READ,
        ENUM_AUTH_PERMISSIONS.ROLE_UPDATE
    )
    @AuthApiKey()
    @RequestValidateUserAgent()
    @Patch('/update/:role/active')
    async active(@GetRole() role: IRoleDocument): Promise<void> {
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
