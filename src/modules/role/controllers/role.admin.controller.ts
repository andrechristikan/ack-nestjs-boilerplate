import {
    Body,
    ConflictException,
    Controller,
    Delete,
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
} from '@common/pagination/decorators/pagination.decorator';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '@modules/policy/enums/policy.enum';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from '@modules/policy/decorators/policy.decorator';
import {
    ROLE_DEFAULT_AVAILABLE_SEARCH,
    ROLE_DEFAULT_IS_ACTIVE,
    ROLE_DEFAULT_ROLE_TYPE,
} from '@modules/role/constants/role.list.constant';
import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleIsActivePipe } from '@modules/role/pipes/role.is-active.pipe';
import { RoleParsePipe } from '@modules/role/pipes/role.parse.pipe';
import { RoleService } from '@modules/role/services/role.service';
import { RoleIsUsedPipe } from '@modules/role/pipes/role.is-used.pipe';
import {
    RoleAdminCreateDoc,
    RoleAdminGetDoc,
    RoleAdminListDoc,
} from '@modules/role/docs/role.admin.doc';
import { IPaginationQueryReturn } from '@common/pagination/interfaces/pagination.interface';
import { IDatabaseFilterOperation } from '@common/database/interfaces/database.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { RoleEntity } from '@modules/role/repository/entities/role.entity';
import { RoleResponseDto } from '@modules/role/dtos/response/role.response.dto';

@ApiTags('modules.admin.role')
@Controller({
    version: '1',
    path: '/role',
})
export class RoleAdminController {
    constructor(private readonly roleService: RoleService) {}

    @RoleAdminListDoc()
    @ResponsePaging('role.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.ROLE,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    // @UserProtected() // TODO: Resolve this
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationQuery({
            availableSearch: ROLE_DEFAULT_AVAILABLE_SEARCH,
        })
        pagination: IPaginationQueryReturn,
        @PaginationQueryFilterInBoolean('isActive')
        isActive?: Record<string, IDatabaseFilterOperation>,
        @PaginationQueryFilterInEnum<ENUM_POLICY_ROLE_TYPE>(
            'type',
            ROLE_DEFAULT_ROLE_TYPE
        )
        type?: Record<string, IDatabaseFilterOperation>
    ): Promise<IResponsePagingReturn<RoleListResponseDto>> {
        const results: IResponsePagingReturn<RoleListResponseDto> =
            await this.roleService.findAllWithPagination(
                pagination,
                isActive,
                type
            );

        return results;
    }

    @RoleAdminGetDoc()
    @Response('role.get')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.ROLE,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    // @UserProtected() // TODO: Resolve this
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/get/:role')
    async get(
        @Param('role', RequestRequiredPipe, RoleParsePipe)
        role: RoleEntity
    ): Promise<IResponseReturn<RoleResponseDto>> {
        const mapRole: RoleResponseDto = this.roleService.mapOne(role);

        return { data: mapRole };
    }

    @RoleAdminCreateDoc()
    @Response('role.create')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.ROLE,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.CREATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    // @UserProtected(). // TODO: Resolve this
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/create')
    async create(
        @Body()
        { name, description, type, permissions }: RoleCreateRequestDto
    ): Promise<IResponseReturn<RoleResponseDto>> {
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

    // @RoleAdminUpdateDoc()
    // @Response('role.update')
    // @PolicyAbilityProtected({
    //     subject: ENUM_POLICY_SUBJECT.ROLE,
    //     action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    // })
    // @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    // @UserProtected()
    // @AuthJwtAccessProtected()
    // @ApiKeyProtected()
    // @Put('/update/:role')
    // async update(
    //     @Param('role', RequestRequiredPipe, RoleParsePipe) role: RoleDoc,
    //     @Body()
    //     { description, permissions, type }: RoleUpdateRequestDto
    // ): Promise<IResponse<DatabaseIdResponseDto>> {
    //     await this.roleService.update(role, { description, permissions, type });

    //     return {
    //         data: { _id: role._id },
    //     };
    // }

    // @RoleAdminInactiveDoc()
    // @Response('role.inactive')
    // @PolicyAbilityProtected({
    //     subject: ENUM_POLICY_SUBJECT.ROLE,
    //     action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    // })
    // @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    // @UserProtected()
    // @AuthJwtAccessProtected()
    // @ApiKeyProtected()
    // @Patch('/update/:role/inactive')
    // async inactive(
    //     @Param(
    //         'role',
    //         RequestRequiredPipe,
    //         RoleParsePipe,
    //         new RoleIsActivePipe([true])
    //     )
    //     role: RoleDoc
    // ): Promise<void> {
    //     await this.roleService.inactive(role);

    //     return;
    // }

    // @RoleAdminActiveDoc()
    // @Response('role.active')
    // @PolicyAbilityProtected({
    //     subject: ENUM_POLICY_SUBJECT.ROLE,
    //     action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    // })
    // @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    // @UserProtected()
    // @AuthJwtAccessProtected()
    // @ApiKeyProtected()
    // @Patch('/update/:role/active')
    // async active(
    //     @Param(
    //         'role',
    //         RequestRequiredPipe,
    //         RoleParsePipe,
    //         new RoleIsActivePipe([false])
    //     )
    //     role: RoleDoc
    // ): Promise<void> {
    //     await this.roleService.active(role);

    //     return;
    // }

    // @RoleAdminDeleteDoc()
    // @Response('role.delete')
    // @PolicyAbilityProtected({
    //     subject: ENUM_POLICY_SUBJECT.ROLE,
    //     action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.DELETE],
    // })
    // @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    // @UserProtected()
    // @AuthJwtAccessProtected()
    // @ApiKeyProtected()
    // @Delete('/delete/:role')
    // async delete(
    //     @Param('role', RequestRequiredPipe, RoleParsePipe, RoleIsUsedPipe)
    //     role: RoleDoc
    // ): Promise<void> {
    //     await this.roleService.delete(role);

    //     return;
    // }
}
