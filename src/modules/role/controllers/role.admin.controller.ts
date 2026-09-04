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
import { RequestThrottle } from '@common/request/decorators/request.throttler.decorator';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';
import { RoleHttpService } from '@modules/role/services/role.http.service';
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
import {
    RoleCreateRequestDto,
    RoleCreateRequestSchema,
} from '@modules/role/dtos/request/role.create.request.dto';
import {
    RoleUpdateRequestDto,
    RoleUpdateRequestSchema,
} from '@modules/role/dtos/request/role.update.request.dto';
import { RequestIsValidUuidPipe } from '@common/request/pipes/request.is-valid-uuid.pipe';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import {
    EnumActivityLogAction,
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
    Prisma,
} from '@generated/prisma-client';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { RoleDto, RoleSchema } from '@modules/role/dtos/role.dto';
import { ActivityLog } from '@modules/activity-log/decorators/activity-log.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import {
    PaginationOffsetQuery,
    PaginationQueryFilterInEnum,
} from '@common/pagination/decorators/pagination.decorator';
import {
    RoleDefaultAvailableOrderBy,
    RoleDefaultAvailableSearch,
    RoleDefaultType,
} from '@modules/role/constants/role.list.constant';
import {
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    RoleListResponseDto,
    RoleListResponseSchema,
} from '@modules/role/dtos/response/role.list.response.dto';

@ApiTags('modules.admin.role')
@Controller({
    version: '1',
    path: '/role',
})
export class RoleAdminController {
    constructor(private readonly roleHttpService: RoleHttpService) {}

    @RoleAdminListDoc()
    @ResponsePaging('role.list', { schema: RoleListResponseSchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.role,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/list')
    async list(
        @PaginationOffsetQuery({
            availableSearch: RoleDefaultAvailableSearch,
            availableOrderBy: RoleDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.RoleWhereInput>,
        @PaginationQueryFilterInEnum<EnumRoleType>('type', RoleDefaultType)
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<RoleListResponseDto>> {
        return this.roleHttpService.getListOffsetByAdmin(pagination, type);
    }

    @RoleAdminGetDoc()
    @Response('role.get', { schema: RoleSchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.role,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/get/:roleId')
    async get(
        @Param('roleId', RequestRequiredPipe, RequestIsValidUuidPipe)
        roleId: string
    ): Promise<IResponseReturn<RoleDto>> {
        return this.roleHttpService.getOne(roleId);
    }

    @RoleAdminCreateDoc()
    @Response('role.create', { schema: RoleSchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.role,
        action: [EnumPolicyAction.read, EnumPolicyAction.create],
    })
    @RoleProtected(EnumRoleType.admin)
    @ActivityLog(EnumActivityLogAction.adminRoleCreate)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Post('/create')
    async create(
        @Body({ schema: RoleCreateRequestSchema })
        body: RoleCreateRequestDto
    ): Promise<IResponseReturn<RoleDto>> {
        return this.roleHttpService.createByAdmin(body);
    }

    @RoleAdminUpdateDoc()
    @Response('role.update', { schema: RoleSchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.role,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @ActivityLog(EnumActivityLogAction.adminRoleUpdate)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Put('/update/:roleId')
    async update(
        @Param('roleId', RequestRequiredPipe, RequestIsValidUuidPipe)
        roleId: string,
        @Body({ schema: RoleUpdateRequestSchema })
        body: RoleUpdateRequestDto
    ): Promise<IResponseReturn<RoleDto>> {
        return this.roleHttpService.updateByAdmin(roleId, body);
    }

    @RoleAdminDeleteDoc()
    @Response('role.delete')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.role,
        action: [EnumPolicyAction.read, EnumPolicyAction.delete],
    })
    @RoleProtected(EnumRoleType.admin)
    @ActivityLog(EnumActivityLogAction.adminRoleDelete)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Delete('/delete/:roleId')
    async delete(
        @Param('roleId', RequestRequiredPipe, RequestIsValidUuidPipe)
        roleId: string
    ): Promise<IResponseReturn<void>> {
        return this.roleHttpService.deleteByAdmin(roleId);
    }
}
