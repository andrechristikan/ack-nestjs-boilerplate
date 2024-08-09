import {
    Body,
    ConflictException,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    PaginationQuery,
    PaginationQueryFilterInBoolean,
    PaginationQueryFilterInEnum,
} from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { RequestRequiredPipe } from 'src/common/request/pipes/request.required.pipe';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from 'src/common/response/interfaces/response.interface';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from 'src/modules/auth/decorators/auth.jwt.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from 'src/modules/policy/decorators/policy.decorator';
import {
    ROLE_DEFAULT_AVAILABLE_SEARCH,
    ROLE_DEFAULT_IS_ACTIVE,
    ROLE_DEFAULT_POLICY_ROLE_TYPE,
} from 'src/modules/role/constants/role.list.constant';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/enums/role.status-code.enum';
import {
    RoleAdminActiveDoc,
    RoleAdminCreateDoc,
    RoleAdminGetDoc,
    RoleAdminInactiveDoc,
    RoleAdminListDoc,
    RoleAdminUpdateDoc,
} from 'src/modules/role/docs/role.admin.doc';
import { RoleCreateRequestDto } from 'src/modules/role/dtos/request/role.create.request.dto';
import { RoleUpdateRequestDto } from 'src/modules/role/dtos/request/role.update.request.dto';
import { RoleGetResponseDto } from 'src/modules/role/dtos/response/role.get.response.dto';
import { RoleListResponseDto } from 'src/modules/role/dtos/response/role.list.response.dto';
import { RoleIsActivePipe } from 'src/modules/role/pipes/role.is-active.pipe';
import { RoleParsePipe } from 'src/modules/role/pipes/role.parse.pipe';
import { RoleDoc } from 'src/modules/role/repository/entities/role.entity';
import { RoleService } from 'src/modules/role/services/role.service';
import { UserService } from 'src/modules/user/services/user.service';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';

@ApiTags('modules.admin.role')
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

    @RoleAdminListDoc()
    @ResponsePaging('role.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.ROLE,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationQuery({ availableSearch: ROLE_DEFAULT_AVAILABLE_SEARCH })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterInBoolean('isActive', ROLE_DEFAULT_IS_ACTIVE)
        isActive: Record<string, any>,
        @PaginationQueryFilterInEnum(
            'type',
            ROLE_DEFAULT_POLICY_ROLE_TYPE,
            ENUM_POLICY_ROLE_TYPE
        )
        type: Record<string, any>
    ): Promise<IResponsePaging<RoleListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            ...isActive,
            ...type,
        };

        const roles: RoleDoc[] = await this.roleService.findAll(find, {
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
        const mapRoles: RoleListResponseDto[] =
            await this.roleService.mapList(roles);

        return {
            _pagination: { total, totalPage },
            data: mapRoles,
        };
    }

    @RoleAdminGetDoc()
    @Response('role.get')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.ROLE,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('get/:role')
    async get(
        @Param('role', RequestRequiredPipe, RoleParsePipe) role: RoleDoc
    ): Promise<IResponse<RoleGetResponseDto>> {
        const mapRole: RoleGetResponseDto = await this.roleService.mapGet(role);

        return { data: mapRole };
    }

    @RoleAdminCreateDoc()
    @Response('role.create')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.ROLE,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.CREATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/create')
    async create(
        @Body()
        { name, description, type, permissions }: RoleCreateRequestDto
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const exist: boolean = await this.roleService.existByName(name);
        if (exist) {
            throw new ConflictException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.EXIST,
                message: 'role.error.exist',
            });
        }

        const create = await this.roleService.create({
            name,
            description,
            type,
            permissions,
        });

        return {
            data: { _id: create._id },
        };
    }

    @RoleAdminUpdateDoc()
    @Response('role.update')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.ROLE,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:role')
    async update(
        @Param('role', RequestRequiredPipe, RoleParsePipe) role: RoleDoc,
        @Body()
        { description, permissions, type }: RoleUpdateRequestDto
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        await this.roleService.update(role, { description, permissions, type });

        return {
            data: { _id: role._id },
        };
    }

    @RoleAdminInactiveDoc()
    @Response('role.inactive')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.ROLE,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:role/inactive')
    async inactive(
        @Param(
            'role',
            RequestRequiredPipe,
            RoleParsePipe,
            new RoleIsActivePipe([true])
        )
        role: RoleDoc
    ): Promise<void> {
        await this.roleService.inactive(role);

        return;
    }

    @RoleAdminActiveDoc()
    @Response('role.active')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.ROLE,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:role/active')
    async active(
        @Param(
            'role',
            RequestRequiredPipe,
            RoleParsePipe,
            new RoleIsActivePipe([false])
        )
        role: RoleDoc
    ): Promise<void> {
        await this.roleService.active(role);

        return;
    }
}
