import type { RoleAdminListRequestDto } from '@modules/role/dtos/request/role.admin-list.request.dto';
import { RoleAdminListRequestSchema } from '@modules/role/dtos/request/role.admin-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import {
    Response,
    ResponsePagination,
} from '@common/response/decorators/response.decorator';

import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { PlatformPolicyProtected } from '@modules/policy/decorators/policy.decorator';
import { RoleHttpService } from '@modules/role/services/role.http.service';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';

import { RoleUpdateRequestSchema } from '@modules/role/dtos/request/role.update.request.dto';
import type { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';

import { UserProtected } from '@modules/user/decorators/user.decorator';
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
    constructor(private readonly roleHttpService: RoleHttpService) {}

    @Doc({ summary: 'get list of roles' })
    @ResponsePagination('role.list', { schema: RoleListResponseSchema })
    @TermPolicyAcceptanceProtected()
    @PlatformPolicyProtected({
        subject: EnumPolicySubject.Role,
        action: [EnumPolicyAction.read],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/list')
    async list(
        @Query({ schema: RoleAdminListRequestSchema })
        query: RoleAdminListRequestDto
    ): Promise<IResponsePaginationReturn<RoleListResponseDto>> {
        return this.roleHttpService.getListOffsetByAdmin(query);
    }

    @Doc({ summary: 'get detail a role' })
    @Response('role.get', { schema: RoleSchema })
    @TermPolicyAcceptanceProtected()
    @PlatformPolicyProtected({
        subject: EnumPolicySubject.Role,
        action: [EnumPolicyAction.read],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/get/:roleId')
    async get(
        @Param('roleId', { schema: RequestUuidSchema })
        roleId: string
    ): Promise<IResponseReturn<RoleDto>> {
        return this.roleHttpService.getOne(roleId);
    }

    @Doc({ summary: 'update data a role' })
    @Response('role.update', { schema: RoleSchema })
    @TermPolicyAcceptanceProtected()
    @PlatformPolicyProtected({
        subject: EnumPolicySubject.Role,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Put('/update/:roleId')
    async update(
        @Param('roleId', { schema: RequestUuidSchema })
        roleId: string,
        @Body({ schema: RoleUpdateRequestSchema })
        body: RoleUpdateRequestDto
    ): Promise<IResponseReturn<RoleDto>> {
        return this.roleHttpService.updateByAdmin(roleId, body);
    }
}
