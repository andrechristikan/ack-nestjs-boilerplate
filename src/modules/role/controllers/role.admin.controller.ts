import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
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
    ROLE_DEFAULT_ROLE_TYPE,
} from '@modules/role/constants/role.list.constant';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleService } from '@modules/role/services/role.service';
import {
    RoleAdminActiveDoc,
    RoleAdminCreateDoc,
    RoleAdminGetDoc,
    RoleAdminInactiveDoc,
    RoleAdminListDoc,
    RoleAdminUpdateDoc,
} from '@modules/role/docs/role.admin.doc';
import { IPaginationQueryReturn } from '@common/pagination/interfaces/pagination.interface';
import { IDatabaseFilterOperation } from '@common/database/interfaces/database.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { RoleResponseDto } from '@modules/role/dtos/response/role.response.dto';
import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { RequestObjectIdPipe } from '@common/request/pipes/requiest.object-id.pipe';
import { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';

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
            await this.roleService.getList(pagination, isActive, type);

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
        @Param('role', RequestRequiredPipe, RequestObjectIdPipe)
        roleId: string
    ): Promise<IResponseReturn<RoleResponseDto>> {
        const role: RoleResponseDto = await this.roleService.getOne(roleId);

        return { data: role };
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
        body: RoleCreateRequestDto
    ): Promise<IResponseReturn<RoleResponseDto>> {
        const data = await this.roleService.create(body);

        return {
            data,
        };
    }

    @RoleAdminUpdateDoc()
    @Response('role.update')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.ROLE,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    // @UserProtected(). // TODO: Resolve this
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:role')
    async update(
        @Param('role', RequestRequiredPipe, RequestObjectIdPipe) roleId: string,
        @Body()
        body: RoleUpdateRequestDto
    ): Promise<IResponseReturn<RoleResponseDto>> {
        const data = await this.roleService.update(roleId, body);

        return {
            data,
        };
    }

    @RoleAdminActiveDoc()
    @Response('role.active')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.ROLE,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    // @UserProtected(). // TODO: Resolve this
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:role/active')
    async active(
        @Param('role', RequestRequiredPipe, RequestObjectIdPipe)
        roleId: string
    ): Promise<IResponseReturn<RoleResponseDto>> {
        await this.roleService.active(roleId);

        return;
    }

    @RoleAdminInactiveDoc()
    @Response('role.inactive')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.ROLE,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    // @UserProtected(). // TODO: Resolve this
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:role/inactive')
    async inactive(
        @Param('role', RequestRequiredPipe, RequestObjectIdPipe)
        roleId: string
    ): Promise<IResponseReturn<RoleResponseDto>> {
        await this.roleService.inactive(roleId);

        return;
    }

    // TODO: RESOLVE THIS AFTER USER MODULE IS READY
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
