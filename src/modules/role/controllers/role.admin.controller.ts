import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import { Response } from '@common/response/decorators/response.decorator';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';
import { PolicyAbilityProtected } from '@modules/policy/decorators/policy.decorator';
import { RoleService } from '@modules/role/services/role.service';
import {
    RoleAdminCreateDoc,
    RoleAdminDeleteDoc,
    RoleAdminGetDoc,
    RoleAdminListDoc,
    RoleAdminUpdateDoc,
} from '@modules/role/docs/role.admin.doc';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import { RequestIsValidObjectIdPipe } from '@common/request/pipes/request.is-valid-object-id.pipe';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import {
    EnumActivityLogAction,
    EnumRoleType,
    Prisma,
} from '@generated/prisma-client';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { RoleDto } from '@modules/role/dtos/role.dto';
import { ActivityLog } from '@modules/activity-log/decorators/activity-log.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import {
    PaginationOffsetQuery,
    PaginationQueryFilterInEnum,
} from '@common/pagination/decorators/pagination.decorator';
import {
    RoleDefaultAvailableSearch,
    RoleDefaultType,
} from '@modules/role/constants/role.list.constant';
import {
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';

@ApiTags('modules.admin.role')
@Controller({
    version: '1',
    path: '/role',
})
export class RoleAdminController {
    constructor(private readonly roleService: RoleService) {}

    @RoleAdminListDoc()
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.role,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Response('role.list')
    @Get('/list')
    async list(
        @PaginationOffsetQuery({
            availableSearch: RoleDefaultAvailableSearch,
        })
        pagination: IPaginationQueryOffsetParams<
            Prisma.RoleSelect,
            Prisma.RoleWhereInput
        >,
        @PaginationQueryFilterInEnum<EnumRoleType>('type', RoleDefaultType)
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<RoleListResponseDto>> {
        return this.roleService.getListOffsetByAdmin(pagination, type);
    }

    @RoleAdminGetDoc()
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.role,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Response('role.get')
    @Get('/get/:roleId')
    async get(
        @Param('roleId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        roleId: string
    ): Promise<IResponseReturn<RoleDto>> {
        return this.roleService.getOne(roleId);
    }

    @RoleAdminCreateDoc()
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.role,
        action: [EnumPolicyAction.read, EnumPolicyAction.create],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @ActivityLog(EnumActivityLogAction.adminRoleCreate)
    @Response('role.create')
    @Post('/create')
    async create(
        @Body()
        body: RoleCreateRequestDto
    ): Promise<IResponseReturn<RoleDto>> {
        return this.roleService.createByAdmin(body);
    }

    @RoleAdminUpdateDoc()
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.role,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @ActivityLog(EnumActivityLogAction.adminRoleUpdate)
    @Response('role.update')
    @Put('/update/:roleId')
    async update(
        @Param('roleId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        roleId: string,
        @Body()
        body: RoleUpdateRequestDto
    ): Promise<IResponseReturn<RoleDto>> {
        return this.roleService.updateByAdmin(roleId, body);
    }

    @RoleAdminDeleteDoc()
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.role,
        action: [EnumPolicyAction.read, EnumPolicyAction.delete],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @ActivityLog(EnumActivityLogAction.adminRoleDelete)
    @Response('role.delete')
    @Delete('/delete/:roleId')
    async delete(
        @Param('roleId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        roleId: string
    ): Promise<IResponseReturn<void>> {
        return this.roleService.deleteByAdmin(roleId);
    }
}
