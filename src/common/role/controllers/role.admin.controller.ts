import {
    Body,
    ConflictException,
    Controller,
    Delete,
    Get,
    InternalServerErrorException,
    Patch,
    Post,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthJwtAdminAccessProtected } from 'src/common/auth/decorators/auth.jwt.decorator';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import {
    PaginationQuery,
    PaginationQueryFilterInBoolean,
    PaginationQueryFilterInEnum,
} from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
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
import { ENUM_ROLE_TYPE } from 'src/common/role/constants/role.enum.constant';
import {
    ROLE_DEFAULT_AVAILABLE_ORDER_BY,
    ROLE_DEFAULT_AVAILABLE_SEARCH,
    ROLE_DEFAULT_IS_ACTIVE,
    ROLE_DEFAULT_ORDER_BY,
    ROLE_DEFAULT_ORDER_DIRECTION,
    ROLE_DEFAULT_PER_PAGE,
    ROLE_DEFAULT_TYPE,
} from 'src/common/role/constants/role.list.constant';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/common/role/constants/role.status-code.constant';
import {
    RoleAdminDeleteGuard,
    RoleAdminGetGuard,
    RoleAdminUpdateActiveGuard,
    RoleAdminUpdateGuard,
    RoleAdminUpdateInactiveGuard,
} from 'src/common/role/decorators/role.admin.decorator';
import { GetRole } from 'src/common/role/decorators/role.decorator';
import {
    RoleActiveDoc,
    RoleCreateDoc,
    RoleDeleteDoc,
    RoleGetDoc,
    RoleInactiveDoc,
    RoleListDoc,
    RoleUpdateDoc,
} from 'src/common/role/docs/role.admin.doc';
import { RoleCreateDto } from 'src/common/role/dtos/role.create.dto';
import { RoleRequestDto } from 'src/common/role/dtos/role.request.dto';
import { RoleUpdatePermissionDto } from 'src/common/role/dtos/role.update-permission.dto';
import { RoleUpdateDto } from 'src/common/role/dtos/role.update.dto';
import {
    RoleDoc,
    RoleEntity,
} from 'src/common/role/repository/entities/role.entity';
import { RoleGetSerialization } from 'src/common/role/serializations/role.get.serialization';
import { RoleListSerialization } from 'src/common/role/serializations/role.list.serialization';
import { RoleService } from 'src/common/role/services/role.service';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import { UserService } from 'src/modules/user/services/user.service';

@ApiTags('admin.role')
@Controller({
    version: '1',
    path: '/role',
})
export class RoleAdminController {
    constructor(
        private readonly paginationService: PaginationService,
        private readonly roleService: RoleService,
        private readonly userService: UserService
    ) {}

    @RoleListDoc()
    @ResponsePaging('role.list', {
        serialization: RoleListSerialization,
    })
    @AuthJwtAdminAccessProtected()
    @Get('/list')
    async list(
        @PaginationQuery(
            ROLE_DEFAULT_PER_PAGE,
            ROLE_DEFAULT_ORDER_BY,
            ROLE_DEFAULT_ORDER_DIRECTION,
            ROLE_DEFAULT_AVAILABLE_SEARCH,
            ROLE_DEFAULT_AVAILABLE_ORDER_BY
        )
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterInBoolean('isActive', ROLE_DEFAULT_IS_ACTIVE)
        isActive: Record<string, any>,
        @PaginationQueryFilterInEnum('type', ROLE_DEFAULT_TYPE, ENUM_ROLE_TYPE)
        type: Record<string, any>
    ): Promise<IResponsePaging> {
        const find: Record<string, any> = {
            ..._search,
            ...isActive,
            ...type,
        };

        const roles: RoleEntity[] = await this.roleService.findAll(find, {
            paging: {
                limit: _limit,
                offset: _offset,
            },
            order: _order,
        });

        const total: number = await this.roleService.getTotal(find);
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        return {
            _pagination: { total, totalPage },
            data: roles,
        };
    }

    @RoleGetDoc()
    @Response('role.get', {
        serialization: RoleGetSerialization,
    })
    @RoleAdminGetGuard()
    @RequestParamGuard(RoleRequestDto)
    @AuthJwtAdminAccessProtected()
    @Get('get/:role')
    async get(@GetRole(true) role: RoleEntity): Promise<IResponse> {
        return { data: role };
    }

    @RoleCreateDoc()
    @Response('role.create', {
        serialization: ResponseIdSerialization,
    })
    @AuthJwtAdminAccessProtected()
    @Post('/create')
    async create(
        @Body()
        { name, description, type, permissions }: RoleCreateDto
    ): Promise<IResponse> {
        const exist: boolean = await this.roleService.existByName(name);
        if (exist) {
            throw new ConflictException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_EXIST_ERROR,
                message: 'role.error.exist',
            });
        }

        try {
            const create = await this.roleService.create({
                name,
                description,
                type,
                permissions,
            });

            return {
                data: { _id: create._id },
            };
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }
    }

    @RoleUpdateDoc()
    @Response('role.update', {
        serialization: ResponseIdSerialization,
    })
    @RoleAdminUpdateGuard()
    @RequestParamGuard(RoleRequestDto)
    @AuthJwtAdminAccessProtected()
    @Put('/update/:role')
    async update(
        @GetRole() role: RoleDoc,
        @Body()
        { description }: RoleUpdateDto
    ): Promise<IResponse> {
        try {
            await this.roleService.update(role, { description });
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }

        return {
            data: { _id: role._id },
        };
    }

    @RoleUpdateDoc()
    @Response('role.updatePermission', {
        serialization: ResponseIdSerialization,
    })
    @RoleAdminUpdateGuard()
    @RequestParamGuard(RoleRequestDto)
    @AuthJwtAdminAccessProtected()
    @Put('/update/:role/permission')
    async updatePermission(
        @GetRole() role: RoleDoc,
        @Body()
        { permissions, type }: RoleUpdatePermissionDto
    ): Promise<IResponse> {
        try {
            await this.roleService.updatePermissions(role, {
                permissions,
                type,
            });
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }

        return {
            data: { _id: role._id },
        };
    }

    @RoleDeleteDoc()
    @Response('role.delete')
    @RoleAdminDeleteGuard()
    @RequestParamGuard(RoleRequestDto)
    @AuthJwtAdminAccessProtected()
    @Delete('/delete/:role')
    async delete(@GetRole() role: RoleDoc): Promise<void> {
        const used: UserDoc = await this.userService.findOne({
            role: role._id,
        });
        if (used) {
            throw new ConflictException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_USED_ERROR,
                message: 'role.error.used',
            });
        }

        try {
            await this.roleService.delete(role);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }

        return;
    }

    @RoleInactiveDoc()
    @Response('role.inactive')
    @RoleAdminUpdateInactiveGuard()
    @RequestParamGuard(RoleRequestDto)
    @AuthJwtAdminAccessProtected()
    @Patch('/update/:role/inactive')
    async inactive(@GetRole() role: RoleDoc): Promise<void> {
        try {
            await this.roleService.inactive(role);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }

        return;
    }

    @RoleActiveDoc()
    @Response('role.active')
    @RoleAdminUpdateActiveGuard()
    @RequestParamGuard(RoleRequestDto)
    @AuthJwtAdminAccessProtected()
    @Patch('/update/:role/active')
    async active(@GetRole() role: RoleDoc): Promise<void> {
        try {
            await this.roleService.active(role);
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err.message,
            });
        }

        return;
    }
}
