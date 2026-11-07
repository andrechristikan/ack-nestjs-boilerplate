import type { RoleAdminListRequestDto } from '@modules/role/dtos/request/role.admin-list.request.dto';
import { RoleAdminListRequestSchema } from '@modules/role/dtos/request/role.admin-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { RequestMongoIdSchema } from '@common/request/validations/request.mongo-id.validation';
import {
    Response,
    ResponsePagination,
} from '@common/response/decorators/response.decorator';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';
import { RoleGetListOffsetByAdminUseCase } from '@modules/role/use-cases/role.get-list-offset-by-admin.use-case';
import { RoleGetOneUseCase } from '@modules/role/use-cases/role.get-one.use-case';
import { RoleCreateByAdminUseCase } from '@modules/role/use-cases/role.create-by-admin.use-case';
import { RoleUpdateByAdminUseCase } from '@modules/role/use-cases/role.update-by-admin.use-case';
import { RoleDeleteByAdminUseCase } from '@modules/role/use-cases/role.delete-by-admin.use-case';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { RoleCreateRequestSchema } from '@modules/role/dtos/request/role.create.request.dto';
import type { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { RoleUpdateRequestSchema } from '@modules/role/dtos/request/role.update.request.dto';
import type { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
} from '@generated/prisma-client/client';
import {
    UserCurrent,
    UserProtected,
} from '@modules/user/decorators/user.decorator';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { RoleSchema } from '@modules/role/dtos/role.dto';
import type { RoleDto } from '@modules/role/dtos/role.dto';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { RoleListResponseSchema } from '@modules/role/dtos/response/role.list.response.dto';
import type { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';

@ApiTags('modules.admin.role')
@Controller({
    version: '1',
    path: '/role',
})
export class RoleAdminController {
    constructor(
        private readonly roleGetListOffsetByAdminUseCase: RoleGetListOffsetByAdminUseCase,
        private readonly roleGetOneUseCase: RoleGetOneUseCase,
        private readonly roleCreateByAdminUseCase: RoleCreateByAdminUseCase,
        private readonly roleUpdateByAdminUseCase: RoleUpdateByAdminUseCase,
        private readonly roleDeleteByAdminUseCase: RoleDeleteByAdminUseCase
    ) {}

    @Doc({ summary: 'get list of roles' })
    @ResponsePagination('role.list', { schema: RoleListResponseSchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.role,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @Query({ schema: RoleAdminListRequestSchema })
        query: RoleAdminListRequestDto
    ): Promise<IResponsePaginationReturn<RoleListResponseDto>> {
        return this.roleGetListOffsetByAdminUseCase.execute(query);
    }

    @Doc({ summary: 'get detail a role' })
    @Response('role.get', { schema: RoleSchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.role,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/get/:roleId')
    async get(
        @Param('roleId', { schema: RequestMongoIdSchema })
        roleId: string
    ): Promise<IResponseReturn<RoleDto>> {
        return this.roleGetOneUseCase.execute(roleId);
    }

    @Doc({ summary: 'create a role' })
    @Response('role.create', { schema: RoleSchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.role,
        action: [EnumPolicyAction.read, EnumPolicyAction.create],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/create')
    async create(
        @Body({ schema: RoleCreateRequestSchema })
        body: RoleCreateRequestDto,
        @UserCurrent() user: IUser
    ): Promise<IResponseReturn<RoleDto>> {
        return this.roleCreateByAdminUseCase.execute(body, user);
    }

    @Doc({ summary: 'update data a role' })
    @Response('role.update', { schema: RoleSchema })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.role,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:roleId')
    async update(
        @Param('roleId', { schema: RequestMongoIdSchema })
        roleId: string,
        @Body({ schema: RoleUpdateRequestSchema })
        body: RoleUpdateRequestDto,
        @UserCurrent() user: IUser
    ): Promise<IResponseReturn<RoleDto>> {
        return this.roleUpdateByAdminUseCase.execute(roleId, body, user);
    }

    @Doc({ summary: 'delete data a role' })
    @Response('role.delete')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.role,
        action: [EnumPolicyAction.read, EnumPolicyAction.delete],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/delete/:roleId')
    async delete(
        @Param('roleId', { schema: RequestMongoIdSchema })
        roleId: string,
        @UserCurrent() user: IUser
    ): Promise<IResponseReturn<void>> {
        return this.roleDeleteByAdminUseCase.execute(roleId, user);
    }
}
